import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

async function loadUser(req, optional) {
  const token = req.cookies?.token || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
  if (!token) {
    if (optional) return;
    throw new ApiError(401, "Authentication required.");
  }
  if (!process.env.JWT_SECRET) throw new ApiError(503, "Authentication is unavailable: configure JWT_SECRET.");
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired authentication token.");
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, "Account is unavailable.");
  req.user = user;
}

export const authenticate = asyncHandler(async (req, res, next) => {
  await loadUser(req, false);
  next();
});

export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  await loadUser(req, true);
  next();
});

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new ApiError(403, "You do not have permission to do this."));
    next();
  };
}
