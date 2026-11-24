import { Router } from "express";
import { login, logout, me, register } from "../controllers/auth.controller.js";
import { optionalAuthenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimits.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.post("/register", authLimiter, asyncHandler(register));
router.post("/login", authLimiter, asyncHandler(login));
router.post("/logout", logout);
router.get("/me", optionalAuthenticate, me);

export default router;
