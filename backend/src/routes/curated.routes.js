import { Router } from "express";
import { createCollection, createTrail, getCollection, getTrail, listCollections, listTrails } from "../controllers/curated.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { submissionLimiter } from "../middleware/rateLimits.js";
import asyncHandler from "../utils/asyncHandler.js";

export const collectionsRouter = Router();
collectionsRouter.get("/", asyncHandler(listCollections));
collectionsRouter.post("/", authenticate, authorize("curator", "admin"), submissionLimiter, asyncHandler(createCollection));
collectionsRouter.get("/:id", asyncHandler(getCollection));

export const trailsRouter = Router();
trailsRouter.get("/", asyncHandler(listTrails));
trailsRouter.post("/", authenticate, authorize("curator", "admin"), submissionLimiter, asyncHandler(createTrail));
trailsRouter.get("/:id", asyncHandler(getTrail));
