import { Router } from "express";
import multer from "multer";
import { uploadImages } from "../controllers/uploads.controller.js";
import { authenticate } from "../middleware/auth.js";
import { submissionLimiter } from "../middleware/rateLimits.js";
import { getCloudinary } from "../services/cloudinary.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter(req, file, callback) {
    callback(allowedTypes.has(file.mimetype) ? null : new ApiError(400, "Only JPEG, PNG, WebP, or AVIF images are allowed."), allowedTypes.has(file.mimetype));
  },
});

router.post(
  "/images",
  authenticate,
  submissionLimiter,
  asyncHandler(async (req, res, next) => {
    getCloudinary();
    next();
  }),
  upload.fields([{ name: "images", maxCount: 8 }, { name: "image", maxCount: 1 }]),
  (req, res, next) => {
    const files = [...(req.files?.images || []), ...(req.files?.image || [])];
    if (!files.length) return next(new ApiError(400, "At least one image file is required."));
    if (files.length > 8) return next(new ApiError(400, "Upload at most 8 images per request."));
    req.uploadFiles = files;
    return next();
  },
  asyncHandler(uploadImages),
);

export default router;
