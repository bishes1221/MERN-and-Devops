import { Router } from "express";
import {
  addGemToBucketList,
  createBucketList,
  deleteBucketList,
  getBucketList,
  listBucketLists,
  removeGemFromBucketList,
  updateBucketList,
} from "../controllers/bucketLists.controller.js";
import { authenticate } from "../middleware/auth.js";
import { submissionLimiter } from "../middleware/rateLimits.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();
router.use(authenticate);
router.get("/", asyncHandler(listBucketLists));
router.post("/", submissionLimiter, asyncHandler(createBucketList));
router.get("/:id", asyncHandler(getBucketList));
router.patch("/:id", asyncHandler(updateBucketList));
router.delete("/:id", asyncHandler(deleteBucketList));
router.put("/:id/gems/:gemId", submissionLimiter, asyncHandler(addGemToBucketList));
router.delete("/:id/gems/:gemId", asyncHandler(removeGemFromBucketList));

export default router;
