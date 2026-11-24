import Collection from "../models/Collection.js";
import Gem from "../models/Gem.js";
import Trail from "../models/Trail.js";
import ApiError from "../utils/ApiError.js";
import { validateId } from "../utils/validation.js";

function validateGemIds(value, field) {
  if (!Array.isArray(value) || value.length > 50 || value.some((id) => !/^[a-f\d]{24}$/i.test(String(id)))) {
    throw new ApiError(400, `${field} must be an array of up to 50 gem IDs.`);
  }
}

export async function listCollections(req, res) {
  const collections = await Collection.find({ status: "published" }).populate({
    path: "gems",
    match: { status: "approved" },
    populate: { path: "createdBy", select: "name avatarUrl" },
  }).populate("createdBy", "name avatarUrl").sort({ createdAt: -1 }).lean();
  res.json({ collections });
}

export async function getCollection(req, res) {
  validateId(req.params.id, "collection id");
  const collection = await Collection.findOne({ _id: req.params.id, status: "published" }).populate({
    path: "gems",
    match: { status: "approved" },
    populate: { path: "createdBy", select: "name avatarUrl" },
  }).populate("createdBy", "name avatarUrl").lean();
  if (!collection) throw new ApiError(404, "Collection not found.");
  res.json({ collection });
}

export async function createCollection(req, res) {
  const { title, description, gems = [], coverUrl } = req.body;
  if (typeof title !== "string" || title.trim().length < 3 || typeof description !== "string" || description.trim().length < 10) throw new ApiError(400, "A title and description are required.");
  validateGemIds(gems, "gems");
  if (gems.length && await Gem.countDocuments({ _id: { $in: gems }, status: "approved" }) !== new Set(gems.map(String)).size) throw new ApiError(400, "All collection gems must be approved.");
  if (coverUrl !== undefined && (typeof coverUrl !== "string" || !/^https?:\/\/\S+$/i.test(coverUrl))) throw new ApiError(400, "Cover URL must be a valid http(s) URL.");
  const collection = await Collection.create({ title: title.trim(), description: description.trim(), gems, coverUrl, createdBy: req.user.id, status: "published" });
  res.status(201).json({ collection });
}

export async function listTrails(req, res) {
  const trails = await Trail.find({ status: "published" }).populate({ path: "stops", match: { status: "approved" } }).populate("createdBy", "name avatarUrl").sort({ createdAt: -1 }).lean();
  res.json({ trails });
}

export async function getTrail(req, res) {
  validateId(req.params.id, "trail id");
  const trail = await Trail.findOne({ _id: req.params.id, status: "published" }).populate({ path: "stops", match: { status: "approved" } }).populate("createdBy", "name avatarUrl").lean();
  if (!trail) throw new ApiError(404, "Trail not found.");
  res.json({ trail });
}

export async function createTrail(req, res) {
  const { title, description, difficulty = "easy", durationMinutes, stops = [], coordinates = [] } = req.body;
  if (typeof title !== "string" || title.trim().length < 3 || typeof description !== "string" || description.trim().length < 10) throw new ApiError(400, "A title and description are required.");
  if (!["easy", "moderate", "challenging"].includes(difficulty)) throw new ApiError(400, "Invalid trail difficulty.");
  validateGemIds(stops, "stops");
  if (stops.length && await Gem.countDocuments({ _id: { $in: stops }, status: "approved" }) !== new Set(stops.map(String)).size) throw new ApiError(400, "All trail stops must be approved gems.");
  if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.length > 500 || coordinates.some((point) => !Array.isArray(point) || point.length !== 2 || point.some((n) => !Number.isFinite(Number(n))))) throw new ApiError(400, "Trail route must contain 2–500 [longitude, latitude] pairs.");
  const trail = await Trail.create({ title: title.trim(), description: description.trim(), difficulty, durationMinutes, stops, route: { type: "LineString", coordinates: coordinates.map((point) => point.map(Number)) }, createdBy: req.user.id, status: "published" });
  res.status(201).json({ trail });
}
