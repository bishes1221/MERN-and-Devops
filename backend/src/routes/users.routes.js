import { Router } from "express";
import { getDashboard, getLeaderboard, getProfile, getPublicProfile, updateProfile } from "../controllers/users.controller.js";
import { authenticate } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

export const usersRouter = Router();
usersRouter.get("/profile", authenticate, asyncHandler(getProfile));
usersRouter.put("/profile", authenticate, asyncHandler(updateProfile));
usersRouter.get("/me", authenticate, asyncHandler(getProfile));
usersRouter.patch("/me", authenticate, asyncHandler(updateProfile));
usersRouter.get("/:id", asyncHandler(getPublicProfile));

export const dashboardRouter = Router();
dashboardRouter.get("/", authenticate, asyncHandler(getDashboard));

export const leaderboardRouter = Router();
leaderboardRouter.get("/", asyncHandler(getLeaderboard));
