import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import requireDatabase from "./middleware/requireDatabase.js";
import healthRouter from "./routes/health.routes.js";
import authRouter from "./routes/auth.routes.js";
import gemsRouter from "./routes/gems.routes.js";
import { bookmarksRouter, notificationsRouter, reportsRouter } from "./routes/engagement.routes.js";
import curatorsRouter from "./routes/curators.routes.js";
import adminRouter from "./routes/admin.routes.js";
import { collectionsRouter, trailsRouter } from "./routes/curated.routes.js";
import uploadRouter from "./routes/upload.routes.js";
import { dashboardRouter, leaderboardRouter, usersRouter } from "./routes/users.routes.js";
import upvotesRouter from "./routes/upvotes.routes.js";
import reviewsRouter from "./routes/reviews.routes.js";
import bucketListsRouter from "./routes/bucketLists.routes.js";
import publicRouter from "./routes/public.routes.js";

const app = express();

const trustProxySetting = process.env.TRUST_PROXY;
const trustProxy = trustProxySetting === undefined
  ? process.env.NODE_ENV === "production" ? 1 : false
  : trustProxySetting === "true" ? true
    : trustProxySetting === "false" ? false
      : Number.isFinite(Number(trustProxySetting)) ? Number(trustProxySetting) : false;
app.set("trust proxy", trustProxy);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb", strict: true }));
app.use((req, res, next) => {
  req.body ||= {};
  next();
});
app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
  morgan.token("safe-url", (req) => req.path);
  app.use(morgan(":method :safe-url :status :response-time ms"));
}

app.use("/api/health", healthRouter);
app.use("/api", requireDatabase);
app.use("/api/public", publicRouter);
app.use("/api/auth", authRouter);
app.use("/api/gems", gemsRouter);
app.use("/api/bookmarks", bookmarksRouter);
app.use("/api/bucket-lists", bucketListsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/curators", curatorsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/collections", collectionsRouter);
app.use("/api/trails", trailsRouter);
app.use("/api/uploads", uploadRouter);
app.use("/api/users", usersRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/upvotes", upvotesRouter);
app.use("/api/reviews", reviewsRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
