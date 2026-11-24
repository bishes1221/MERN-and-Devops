import { Router } from "express";
import { listCuratorApplications, listGemClaims, listPendingGems, listReports, listUsers, moderateCurator, moderateGem, moderateGemClaim, stats, updateReport, updateUser } from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();
router.use(authenticate, authorize("admin"));
router.get("/stats", asyncHandler(stats));
router.get("/gems", asyncHandler(listPendingGems));
router.get("/gems/pending", asyncHandler(listPendingGems));
router.patch("/gems/:id", asyncHandler(moderateGem));
router.patch("/gems/:id/status", asyncHandler(moderateGem));
router.get("/users", asyncHandler(listUsers));
router.patch("/users/:id", asyncHandler(updateUser));
router.patch("/users/:id/status", asyncHandler(updateUser));
router.get("/reports", asyncHandler(listReports));
router.patch("/reports/:id", asyncHandler(updateReport));
router.get("/curators", asyncHandler(listCuratorApplications));
router.get("/curators/pending", asyncHandler(listCuratorApplications));
router.patch("/curators/:id", asyncHandler(moderateCurator));
router.patch("/curators/:id/verification", asyncHandler(moderateCurator));
router.get("/claims", asyncHandler(listGemClaims));
router.patch("/claims/:id", asyncHandler(moderateGemClaim));

export default router;
