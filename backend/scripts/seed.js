import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import User from "../src/models/User.js";
import Gem from "../src/models/Gem.js";

// Run with `npm run seed --workspace=backend` after setting MONGODB_URI,
// SEED_ADMIN_EMAIL, and a unique SEED_ADMIN_PASSWORD (12+ characters).
const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME || "Hidden Gems Admin";

if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI before running the seed script.");
if (!email || !password || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
  throw new Error("Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of 12–72 UTF-8 bytes.");
}

try {
  await connectDatabase();
  const existing = await User.findOne({ email });
  let admin = existing;
  if (!existing) {
    admin = await User.create({ email, name, password: await bcrypt.hash(password, 12), role: "admin" });
    console.log("Created the seed administrator account.");
  } else if (existing.role !== "admin") {
    throw new Error("The requested seed account already exists but is not an administrator; refusing to change its role.");
  } else {
    console.log("Seed administrator already exists; left its credentials unchanged.");
  }

  const demoGems = [
    {
      title: "The Amber Sparrow Tea Room",
      description: "A fictional, tucked-away tea room imagined for this demo, with quiet reading corners and a small seasonal tea menu.",
      category: "cafe",
      address: "Fictional lane near Patan Durbar Square, Lalitpur",
      location: { type: "Point", coordinates: [85.325, 27.672] },
      tags: ["tea", "quiet", "fictional-demo"],
      priceLevel: 2,
    },
    {
      title: "Lantern Steps Courtyard",
      description: "A fictional community courtyard concept for the demo, featuring lantern-lit seating and views toward the old city rooftops.",
      category: "culture",
      address: "Fictional courtyard near Thamel, Kathmandu",
      location: { type: "Point", coordinates: [85.31, 27.715] },
      tags: ["courtyard", "evening", "fictional-demo"],
      priceLevel: 0,
    },
    {
      title: "Moss & Momo Garden",
      description: "A fictional garden eatery concept for the demo, serving imagined local dumplings beside a small, leafy courtyard.",
      category: "restaurant",
      address: "Fictional garden lane near Boudha, Kathmandu",
      location: { type: "Point", coordinates: [85.36, 27.721] },
      tags: ["garden", "momos", "fictional-demo"],
      priceLevel: 2,
    },
  ];

  for (const demo of demoGems) {
    await Gem.updateOne(
      { title: demo.title, createdBy: admin._id },
      { $setOnInsert: { ...demo, createdBy: admin._id, status: "approved" } },
      { upsert: true, runValidators: true },
    );
  }
  console.log("Seeded three fictional Kathmandu demo gems.");
} catch {
  console.error("Seed failed. Check the database connection, seed inputs, and account state.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
