import Gem from "../models/Gem.js";
import Bookmark from "../models/Bookmark.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { validateId } from "../utils/validation.js";

const publicFields = "name avatarUrl bio neighborhood createdAt role";

function explorerBadges({ gemCount, upvotesReceived, foodGemCount }) {
  const badges = [];
  if (foodGemCount >= 3) badges.push({ name: "Momo Hunter", description: "Mapped three or more local food spots." });
  if (gemCount >= 5) badges.push({ name: "Valley Explorer", description: "Shared five or more approved Kathmandu Valley gems." });
  if (gemCount >= 10 || upvotesReceived >= 25) badges.push({ name: "Top Contributor", description: "Made a lasting contribution to the local map." });
  return badges;
}

function publicUser(user) {
  const value = user.toObject ? user.toObject() : { ...user };
  delete value.password;
  delete value.email;
  delete value.isActive;
  delete value.__v;
  return value;
}

export async function getProfile(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function updateProfile(req, res) {
  const updates = {};

  if (req.body.name !== undefined) {
    if (typeof req.body.name !== "string" || req.body.name.trim().length < 2 || req.body.name.trim().length > 80) {
      throw new ApiError(400, "Name must be between 2 and 80 characters.");
    }
    updates.name = req.body.name.trim();
  }
  if (req.body.bio !== undefined) {
    if (typeof req.body.bio !== "string" || req.body.bio.length > 1000) throw new ApiError(400, "Bio must be at most 1000 characters.");
    updates.bio = req.body.bio.trim();
  }
  if (req.body.neighborhood !== undefined) {
    if (typeof req.body.neighborhood !== "string" || req.body.neighborhood.length > 100) throw new ApiError(400, "Neighborhood must be at most 100 characters.");
    updates.neighborhood = req.body.neighborhood.trim();
  }
  if (req.body.avatarUrl !== undefined) {
    if (typeof req.body.avatarUrl !== "string" || (req.body.avatarUrl && !/^https:\/\/\S+$/i.test(req.body.avatarUrl)) || req.body.avatarUrl.length > 2048) {
      throw new ApiError(400, "Profile image must be a valid https URL.");
    }
    updates.avatarUrl = req.body.avatarUrl || undefined;
  }
  if (req.body.favoriteCategories !== undefined) {
    if (!Array.isArray(req.body.favoriteCategories) || req.body.favoriteCategories.length > 12 || req.body.favoriteCategories.some((item) => typeof item !== "string" || item.trim().length > 60)) {
      throw new ApiError(400, "Choose at most 12 valid favorite categories.");
    }
    updates.favoriteCategories = [...new Set(req.body.favoriteCategories.map((item) => item.trim()).filter(Boolean))];
  }
  if (!Object.keys(updates).length) throw new ApiError(400, "No supported profile fields provided.");

  const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true, runValidators: true });
  res.json({ user: publicUser(user) });
}

export async function getPublicProfile(req, res) {
  validateId(req.params.id, "user id");
  const user = await User.findOne({ _id: req.params.id, isActive: true }).select(publicFields).lean();
  if (!user) throw new ApiError(404, "Explorer not found.");

  const [gemCount, foodGemCount, upvotes] = await Promise.all([
    Gem.countDocuments({ createdBy: user._id, status: "approved" }),
    Gem.countDocuments({ createdBy: user._id, status: "approved", category: /momo|food|restaurant|street/i }),
    Gem.aggregate([
      { $match: { createdBy: user._id, status: "approved" } },
      { $group: { _id: null, total: { $sum: "$upvoteCount" } } },
    ]),
  ]);
  const upvotesReceived = upvotes[0]?.total || 0;
  res.json({ user: { ...user, gemCount, upvotesReceived, badges: explorerBadges({ gemCount, upvotesReceived, foodGemCount }) } });
}

export async function getDashboard(req, res) {
  const userId = req.user._id;
  const [gemCount, pendingGemCount, savedCount, activity, voteTotals, foodGemCount] = await Promise.all([
    Gem.countDocuments({ createdBy: userId, status: "approved" }),
    Gem.countDocuments({ createdBy: userId, status: "pending" }),
    Bookmark.countDocuments({ user: userId }),
    Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Gem.aggregate([
      { $match: { createdBy: userId } },
      { $group: { _id: null, total: { $sum: "$upvoteCount" } } },
    ]),
    Gem.countDocuments({ createdBy: userId, status: "approved", category: /momo|food|restaurant|street/i }),
  ]);

  const upvotesReceived = voteTotals[0]?.total || 0;
  res.json({
    dashboard: {
      gemCount,
      pendingGemCount,
      savedCount,
      followers: 0,
      rank: null,
      upvotesReceived,
      badges: explorerBadges({ gemCount, upvotesReceived, foodGemCount }),
      activity,
    },
  });
}

export async function getLeaderboard(req, res) {
  const rows = await Gem.aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: "$createdBy", gemCount: { $sum: 1 }, points: { $sum: "$upvoteCount" } } },
    { $sort: { points: -1, gemCount: -1, _id: 1 } },
    { $limit: 25 },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $match: { "user.isActive": true } },
    {
      $project: {
        _id: "$user._id",
        name: "$user.name",
        avatarUrl: "$user.avatarUrl",
        bio: "$user.bio",
        neighborhood: "$user.neighborhood",
        role: "$user.role",
        gemCount: 1,
        points: 1,
      },
    },
  ]);

  res.json({
    users: rows.map((user, index) => ({ ...user, rank: index + 1 })),
  });
}
