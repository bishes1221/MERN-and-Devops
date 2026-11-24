import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";

const port = Number(process.env.PORT) || 5001;
const production = process.env.NODE_ENV === "production";
const localDatabasePath = path.resolve(process.cwd(), ".local/mongodb");
const localJwtSecretPath = path.resolve(process.cwd(), ".local/jwt-secret");
let localMongoServer;
let httpServer;

async function getDevelopmentJwtSecret() {
  await mkdir(path.dirname(localJwtSecretPath), { recursive: true });
  try {
    const secret = (await readFile(localJwtSecretPath, "utf8")).trim();
    if (Buffer.byteLength(secret) < 32) throw new Error("Stored development JWT secret is invalid.");
    return secret;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const secret = randomBytes(48).toString("hex");
    await writeFile(localJwtSecretPath, secret, { encoding: "utf8", mode: 0o600, flag: "wx" });
    return secret;
  }
}

const missingProductionConfig = production
  ? ["MONGODB_URI", "JWT_SECRET"].filter((key) => !process.env[key])
  : [];
if (missingProductionConfig.length) {
  console.error(`Startup refused: ${missingProductionConfig.join(" and ")} ${missingProductionConfig.length === 1 ? "is" : "are"} required in production.`);
  process.exit(1);
}
if (production && Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32) {
  console.error("Startup refused: JWT_SECRET must contain at least 32 bytes in production.");
  process.exit(1);
}

try {
  if (!production && !process.env.JWT_SECRET) {
    process.env.JWT_SECRET = await getDevelopmentJwtSecret();
    console.log("Using a private, persistent development JWT secret.");
  }
  if (!process.env.MONGODB_URI && !production) {
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      await mkdir(localDatabasePath, { recursive: true });
      localMongoServer = await MongoMemoryServer.create({ instance: { dbPath: localDatabasePath } });
      await connectDatabase(localMongoServer.getUri("hidden-gems"));
      console.log(`Connected to persistent local development MongoDB at ${localDatabasePath}.`);
    } catch {
      console.error("Could not start the local development database. Check internet access for the first-time MongoDB download, or configure MONGODB_URI.");
      await localMongoServer?.stop();
      process.exitCode = 1;
    }
  } else {
    try {
      const connected = await connectDatabase();
      if (!connected) console.warn("MONGODB_URI is unset; starting without database access (health endpoint remains available).");
      else console.log("Connected to MongoDB.");
    } catch {
      if (production) throw new Error("Database connection failed.");
      console.warn("MongoDB is unavailable; starting in degraded mode. Database-backed endpoints will not work.");
    }
  }
  if (process.exitCode) process.exit(process.exitCode);
  if (!process.env.JWT_SECRET) console.warn("JWT_SECRET is unset; authentication token issuance is unavailable.");
  httpServer = app.listen(port, () => {
    console.log(`Hidden Gems API listening on http://localhost:${port}`);
  });
} catch (error) {
  console.error("Failed to start the API:", production ? error.message : "configuration or database error.");
  process.exitCode = 1;
}

async function shutdown(signal) {
  try {
    if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
    await mongoose.disconnect();
    await localMongoServer?.stop();
  } catch (error) {
    console.error("Graceful shutdown failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (signal === "SIGUSR2") process.kill(process.pid, "SIGUSR2");
  }
}

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.once(signal, () => { void shutdown(signal); });
}
