import { Router } from "express";
import { deleteReview, updateReview } from "../controllers/gems.controller.js";
import { authenticate } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();
router.put("/:id", authenticate, asyncHandler(updateReview));
router.patch("/:id", authenticate, asyncHandler(updateReview));
router.delete("/:id", authenticate, asyncHandler(deleteReview));

export default router;
