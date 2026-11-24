import CuratorProfile from "../models/CuratorProfile.js";
import BucketList from "../models/BucketList.js";
import Bookmark from "../models/Bookmark.js";
import Gem from "../models/Gem.js";
import GemClaim from "../models/GemClaim.js";
import GemUpdate from "../models/GemUpdate.js";
import ApiError from "../utils/ApiError.js";
import { validateId } from "../utils/validation.js";

export async function apply(req, res) {
  const { bio, specialties, website } = req.body;
  if (typeof bio !== "string" || bio.trim().length < 20 || bio.trim().length > 1000) throw new ApiError(400, "Bio must be between 20 and 1000 characters.");
  if (specialties !== undefined && (!Array.isArray(specialties) || specialties.length > 20 || specialties.some((item) => typeof item !== "string" || item.length > 60))) throw new ApiError(400, "Specialties must be an array of up to 20 short strings.");
  if (website !== undefined && website !== "" && (typeof website !== "string" || website.length > 2048 || !/^https?:\/\/\S+$/i.test(website))) throw new ApiError(400, "Website must be a valid http(s) URL.");
  const existing = await CuratorProfile.findOne({ user: req.user.id });
  if (existing) {
    if (existing.status !== "rejected") throw new ApiError(409, "A curator application already exists.");
    existing.bio = bio.trim();
    existing.specialties = specialties || [];
    existing.website = website || undefined;
    existing.status = "pending";
    existing.reviewedBy = undefined;
    existing.reviewedAt = undefined;
    await existing.save();
    return res.status(200).json({ curator: existing });
  }
  const curator = await CuratorProfile.create({ user: req.user.id, bio: bio.trim(), specialties: specialties || [], website: website || undefined });
  res.status(201).json({ curator });
}

export async function listCurators(req, res) {
  const curators = await CuratorProfile.find({ status: "approved" }).populate("user", "name avatarUrl").sort({ createdAt: -1 }).lean();
  res.json({ curators });
}

export async function getCurator(req, res) {
  validateId(req.params.userId, "user id");
  const curator = await CuratorProfile.findOne({ user: req.params.userId, status: "approved" }).populate("user", "name avatarUrl").lean();
  if (!curator) throw new ApiError(404, "Curator not found.");
  res.json({ curator });
}

export async function getCuratorGems(req, res) {
  validateId(req.params.userId, "user id");
  const profile = await CuratorProfile.findOne({ user: req.params.userId, status: "approved" }).select("_id");
  if (!profile) throw new ApiError(404, "Curator not found.");
  const gems = await Gem.find({
    status: "approved",
    $or: [{ createdBy: req.params.userId }, { curator: profile._id }],
  })
    .populate("createdBy", "name avatarUrl")
    .populate({ path: "curator", populate: { path: "user", select: "name avatarUrl" } })
    .sort({ upvoteCount: -1, createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ gems });
}

export async function claimGem(req, res) {
  const { gemId, details } = req.body;
  validateId(gemId, "gem id");
  if (typeof details !== "string" || details.trim().length < 20 || details.trim().length > 1500) {
    throw new ApiError(400, "Explain your connection to this place in 20–1500 characters.");
  }
  const profile = await CuratorProfile.findOne({ user: req.user.id, status: "approved" }).select("_id");
  if (!profile) throw new ApiError(403, "An approved curator profile is required to claim a place.");
  const gem = await Gem.findOne({ _id: gemId, status: "approved" }).select("createdBy curator");
  if (!gem) throw new ApiError(404, "Approved gem not found.");
  if (String(gem.createdBy) === String(req.user.id)) throw new ApiError(400, "You cannot claim a place you submitted.");
  if (gem.curator) throw new ApiError(409, "This place is already managed by a curator.");
  try {
    const claim = await GemClaim.create({ gem: gem._id, curator: profile._id, details: details.trim() });
    res.status(201).json({ claim });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, "A claim for this place is already awaiting review.");
    throw error;
  }
}

export async function listMyClaims(req, res) {
  const profile = await CuratorProfile.findOne({ user: req.user.id, status: "approved" }).select("_id");
  if (!profile) throw new ApiError(403, "An approved curator profile is required.");
  const claims = await GemClaim.find({ curator: profile._id })
    .populate("gem", "title address status curator")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ claims });
}

export async function getCuratorMetrics(req, res) {
  const profile = await CuratorProfile.findOne({ user: req.user.id, status: "approved" }).select("_id");
  if (!profile) throw new ApiError(403, "An approved curator profile is required.");
  const gems = await Gem.find({
    status: "approved",
    $or: [{ createdBy: req.user.id }, { curator: profile._id }],
  }).select("title address viewCount upvoteCount curator").populate("curator", "user").sort({ updatedAt: -1 }).lean();
  const gemIds = gems.map((gem) => gem._id);
  const [bookmarks, bucketLists] = gemIds.length ? await Promise.all([
    Bookmark.aggregate([{ $match: { gem: { $in: gemIds } } }, { $group: { _id: "$gem", count: { $sum: 1 } } }]),
    BucketList.aggregate([
      { $match: { gems: { $in: gemIds } } },
      { $unwind: "$gems" },
      { $match: { gems: { $in: gemIds } } },
      { $group: { _id: "$gems", count: { $sum: 1 } } },
    ]),
  ]) : [[], []];
  const savesByGem = new Map();
  for (const row of [...bookmarks, ...bucketLists]) savesByGem.set(String(row._id), (savesByGem.get(String(row._id)) || 0) + row.count);
  const managedGems = gems.map((gem) => ({ ...gem, saveCount: savesByGem.get(String(gem._id)) || 0 }));
  res.json({
    metrics: {
      gemCount: managedGems.length,
      views: managedGems.reduce((sum, gem) => sum + (gem.viewCount || 0), 0),
      upvotes: managedGems.reduce((sum, gem) => sum + (gem.upvoteCount || 0), 0),
      saves: managedGems.reduce((sum, gem) => sum + gem.saveCount, 0),
    },
    gems: managedGems,
  });
}

export async function postManagedGemUpdate(req, res) {
  validateId(req.params.gemId, "gem id");
  const { message, openingHours } = req.body;
  if (message !== undefined && (typeof message !== "string" || message.trim().length > 1000)) {
    throw new ApiError(400, "Update note must be at most 1000 characters.");
  }
  if (openingHours !== undefined && (typeof openingHours !== "string" || openingHours.trim().length > 500)) {
    throw new ApiError(400, "Opening hours must be at most 500 characters.");
  }
  const cleanMessage = message?.trim();
  const cleanHours = openingHours?.trim();
  if (!cleanMessage && !cleanHours) throw new ApiError(400, "Add an update note or opening hours.");
  const profile = await CuratorProfile.findOne({ user: req.user.id, status: "approved" }).select("_id");
  if (!profile) throw new ApiError(403, "An approved curator profile is required.");
  const gem = await Gem.findOne({ _id: req.params.gemId, status: "approved", curator: profile._id });
  if (!gem) throw new ApiError(404, "This place is not managed by your curator profile.");
  const update = await GemUpdate.create({
    gem: gem._id,
    curator: profile._id,
    message: cleanMessage || undefined,
    openingHours: cleanHours || undefined,
  });
  if (cleanHours) {
    gem.openingHours = cleanHours;
    await gem.save();
  }
  res.status(201).json({ update });
}

export async function listGemUpdates(req, res) {
  validateId(req.params.gemId, "gem id");
  const gem = await Gem.findOne({ _id: req.params.gemId, status: "approved" }).select("_id");
  if (!gem) throw new ApiError(404, "Gem not found.");
  const updates = await GemUpdate.find({ gem: gem._id })
    .populate({ path: "curator", populate: { path: "user", select: "name avatarUrl" } })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  res.json({ updates });
}
