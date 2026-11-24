import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";

const databaseRoutes = new Set([
  "admin",
  "auth",
  "bookmarks",
  "bucket-lists",
  "collections",
  "curators",
  "dashboard",
  "gems",
  "leaderboard",
  "notifications",
  "public",
  "reports",
  "reviews",
  "trails",
  "upvotes",
  "uploads",
  "users",
]);

export default function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  const path = req.originalUrl.split("?")[0];
  const resource = path.split("/")[2];
  if (!databaseRoutes.has(resource)) return next();
  const hasBearerToken = req.headers.authorization?.startsWith("Bearer ");
  if (req.method === "POST" && path === "/api/auth/logout") return next();
  if (req.method === "GET" && path === "/api/auth/me" && !req.cookies?.token && !hasBearerToken) return next();
  return next(new ApiError(503, "Database is unavailable. Try again shortly."));
}
