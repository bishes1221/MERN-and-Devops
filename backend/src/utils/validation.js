import mongoose from "mongoose";
import ApiError from "./ApiError.js";

export function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
  if (missing.length) throw new ApiError(400, `Missing required fields: ${missing.join(", ")}.`);
}

export function validateId(id, label = "id") {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label}.`);
}

export function pick(source, keys) {
  return Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}

export function pagination(query) {
  const page = Math.max(1, Math.min(100000, Number.parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(100, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
