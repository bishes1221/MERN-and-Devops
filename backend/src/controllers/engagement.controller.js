import Bookmark from "../models/Bookmark.js";
import Gem from "../models/Gem.js";
import Notification from "../models/Notification.js";
import Report from "../models/Report.js";
import ApiError from "../utils/ApiError.js";
import { pagination, validateId } from "../utils/validation.js";

export async function listBookmarks(req, res) {
  const rows = await Bookmark.find({ user: req.user.id }).sort({ createdAt: -1 }).populate({
    path: "gem",
    match: { status: "approved" },
    populate: { path: "createdBy", select: "name avatarUrl" },
  }).lean();
  res.json({ gems: rows.map((row) => row.gem).filter(Boolean) });
}

export async function addBookmark(req, res) {
  validateId(req.params.gemId, "gem id");
  const gem = await Gem.findOne({ _id: req.params.gemId, status: "approved" });
  if (!gem) throw new ApiError(404, "Gem not found.");
  await Bookmark.updateOne({ user: req.user.id, gem: gem._id }, { $setOnInsert: { user: req.user.id, gem: gem._id } }, { upsert: true });
  res.status(200).json({ bookmarked: true });
}

export async function removeBookmark(req, res) {
  validateId(req.params.gemId, "gem id");
  await Bookmark.deleteOne({ user: req.user.id, gem: req.params.gemId });
  res.status(204).end();
}

export async function createReport(req, res) {
  validateId(req.body.gemId, "gem id");
  if (!["inaccurate", "closed", "inappropriate", "duplicate", "other"].includes(req.body.reason)) throw new ApiError(400, "A valid report reason is required.");
  if (req.body.details !== undefined && (typeof req.body.details !== "string" || req.body.details.length > 1500)) throw new ApiError(400, "Report details must be at most 1500 characters.");
  const gem = await Gem.findOne({ _id: req.body.gemId, status: "approved" });
  if (!gem) throw new ApiError(404, "Gem not found.");
  const report = await Report.create({ reporter: req.user.id, gem: gem._id, reason: req.body.reason, details: req.body.details?.trim() });
  res.status(201).json({ report });
}

export async function listNotifications(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const [notifications, total, unread] = await Promise.all([
    Notification.find({ recipient: req.user.id }).populate("actor", "name avatarUrl").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments({ recipient: req.user.id }),
    Notification.countDocuments({ recipient: req.user.id, readAt: null }),
  ]);
  res.json({ notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, unread });
}

export async function markNotificationRead(req, res) {
  validateId(req.params.id, "notification id");
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { $set: { readAt: new Date() } },
    { new: true },
  ).lean();
  if (!notification) throw new ApiError(404, "Notification not found.");
  res.json({ notification });
}

export async function markAllNotificationsRead(req, res) {
  await Notification.updateMany({ recipient: req.user.id, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ message: "Notifications marked as read." });
}
