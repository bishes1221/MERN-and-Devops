import { Router } from "express";
import { listMyUpvotes } from "../controllers/upvotes.controller.js";
import { authenticate } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();
router.get("/my", authenticate, asyncHandler(listMyUpvotes));

export default router;
