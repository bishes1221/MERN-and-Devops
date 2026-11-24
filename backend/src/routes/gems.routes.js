import { Router } from "express";
import { addReview, createGem, deleteGem, deleteReview, getGem, listGems, listMyGems, listReviews, toggleUpvote, updateGem, updateReview } from "../controllers/gems.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";
import { submissionLimiter } from "../middleware/rateLimits.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listGems));
router.post("/", authenticate, submissionLimiter, asyncHandler(createGem));
router.get("/mine", authenticate, asyncHandler(listMyGems));
router.get("/:gemId/reviews", asyncHandler(listReviews));
router.get("/:id", optionalAuthenticate, asyncHandler(getGem));
router.patch("/:id", authenticate, asyncHandler(updateGem));
router.put("/:id", authenticate, asyncHandler(updateGem));
router.delete("/:id", authenticate, asyncHandler(deleteGem));
router.post("/:id/upvote", authenticate, asyncHandler(toggleUpvote));
router.post("/:gemId/reviews", authenticate, submissionLimiter, asyncHandler(addReview));
router.patch("/reviews/:id", authenticate, asyncHandler(updateReview));
router.delete("/reviews/:id", authenticate, asyncHandler(deleteReview));

export default router;
