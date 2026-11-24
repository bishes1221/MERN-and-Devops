import { Router } from "express";
import { apply, claimGem, getCurator, getCuratorGems, getCuratorMetrics, listCurators, listGemUpdates, listMyClaims, postManagedGemUpdate } from "../controllers/curators.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { submissionLimiter } from "../middleware/rateLimits.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();
router.post("/apply", authenticate, submissionLimiter, asyncHandler(apply));
router.post("/", authenticate, submissionLimiter, asyncHandler(apply));
router.get("/me/metrics", authenticate, authorize("curator"), asyncHandler(getCuratorMetrics));
router.get("/claims/mine", authenticate, authorize("curator"), asyncHandler(listMyClaims));
router.post("/claims", authenticate, authorize("curator"), submissionLimiter, asyncHandler(claimGem));
router.post("/gems/:gemId/updates", authenticate, authorize("curator"), submissionLimiter, asyncHandler(postManagedGemUpdate));
router.get("/gems/:gemId/updates", asyncHandler(listGemUpdates));
router.get("/", asyncHandler(listCurators));
router.get("/:userId/gems", asyncHandler(getCuratorGems));
router.get("/:userId", asyncHandler(getCurator));

export default router;
