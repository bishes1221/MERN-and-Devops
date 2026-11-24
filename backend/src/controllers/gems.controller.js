import Gem from "../models/Gem.js";
import Upvote from "../models/Upvote.js";
import Bookmark from "../models/Bookmark.js";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import BucketList from "../models/BucketList.js";
import GemClaim from "../models/GemClaim.js";
import GemUpdate from "../models/GemUpdate.js";
import ApiError from "../utils/ApiError.js";
import { escapeRegex, pagination, pick, validateId } from "../utils/validation.js";

const editableFields = ["title", "description", "category", "address", "images", "tags", "priceLevel", "bestTimeToVisit", "insiderTip", "openingHours", "website", "phone"];
const allowedWebUrl = (value) => typeof value === "string" && value.length <= 2048 && /^https?:\/\/\S+$/i.test(value);

function normalizeImages(images) {
  if (images === undefined) return undefined;
  if (!Array.isArray(images) || images.length > 12) throw new ApiError(400, "Images must be an array of at most 12 URLs or image metadata objects.");
  return images.map((image) => {
    const item = typeof image === "string" ? { url: image } : image;
    if (!item || typeof item.url !== "string" || !allowedWebUrl(item.url)) throw new ApiError(400, "Each image must have a valid http(s) URL.");
    return pick(item, ["url", "publicId", "width", "height", "format"]);
  });
}

function normalizeGemBody(body) {
  const fields = pick(body, editableFields);
  if (fields.images !== undefined) fields.images = normalizeImages(fields.images);
  if (fields.tags !== undefined) {
    if (!Array.isArray(fields.tags) || fields.tags.length > 20 || fields.tags.some((tag) => typeof tag !== "string" || tag.trim().length > 40)) {
      throw new ApiError(400, "Tags must be an array of up to 20 short strings.");
    }
    fields.tags = [...new Set(fields.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
  }
  if (fields.priceLevel !== undefined) {
    const priceLevel = Number(fields.priceLevel);
    if (!Number.isInteger(priceLevel) || priceLevel < 0 || priceLevel > 3) throw new ApiError(400, "Price level must be an integer from 0 to 3.");
    fields.priceLevel = priceLevel;
  }
  if (fields.website !== undefined && fields.website !== "" && !allowedWebUrl(fields.website)) throw new ApiError(400, "Website must be a valid http(s) URL.");
  if (body.location !== undefined || body.coordinates !== undefined || body.longitude !== undefined || body.latitude !== undefined) {
    const coordinates = body.location?.coordinates || body.coordinates || [body.longitude, body.latitude];
    if (!Array.isArray(coordinates) || coordinates.length !== 2 || coordinates.some((n) => !Number.isFinite(Number(n)))) {
      throw new ApiError(400, "Location must contain [longitude, latitude] coordinates.");
    }
    fields.location = { type: "Point", coordinates: coordinates.map(Number) };
  }
  return fields;
}

function canViewGem(gem, user) {
  return gem.status === "approved" || (user && (user.role === "admin" || String(gem.createdBy?._id || gem.createdBy) === String(user.id)));
}

export async function listGems(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = { status: "approved" };
  if (typeof req.query.category === "string" && req.query.category.length <= 60) filter.category = req.query.category.trim().toLowerCase();
  if (typeof req.query.neighborhood === "string" && req.query.neighborhood.trim()) {
    filter.address = new RegExp(escapeRegex(req.query.neighborhood.trim().slice(0, 100)), "i");
  }
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    const search = new RegExp(escapeRegex(req.query.q.trim().slice(0, 100)), "i");
    filter.$or = [{ title: search }, { description: search }, { address: search }, { tags: search }];
  }
  if (typeof req.query.tag === "string" && req.query.tag.length <= 40) filter.tags = req.query.tag.trim().toLowerCase();
  if (req.query.minRating !== undefined && Number.isFinite(Number(req.query.minRating))) filter.averageRating = { $gte: Math.min(5, Math.max(0, Number(req.query.minRating))) };
  if (req.query.priceLevel !== undefined) {
    const priceLevel = Number(req.query.priceLevel);
    if (!Number.isInteger(priceLevel) || priceLevel < 0 || priceLevel > 3) throw new ApiError(400, "Price level must be an integer from 0 to 3.");
    filter.priceLevel = priceLevel;
  }
  const bounds = ["minLng", "minLat", "maxLng", "maxLat"].map((key) => Number(req.query[key]));
  if (bounds.every(Number.isFinite)) {
    const [minLng, minLat, maxLng, maxLat] = bounds;
    if (minLng < maxLng && minLat < maxLat && minLng >= -180 && maxLng <= 180 && minLat >= -90 && maxLat <= 90) {
      filter.location = { $geoWithin: { $box: [[minLng, minLat], [maxLng, maxLat]] } };
    }
  }

  const sorts = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    popular: { upvoteCount: -1, createdAt: -1 },
    rating: { averageRating: -1, reviewCount: -1, createdAt: -1 },
    title: { title: 1 },
  };
  const nearest = req.query.sort === "nearest" && Number.isFinite(Number(req.query.lng)) && Number.isFinite(Number(req.query.lat));
  if (nearest) {
    filter.location = {
      $near: {
        $geometry: { type: "Point", coordinates: [Number(req.query.lng), Number(req.query.lat)] },
        $maxDistance: 50000,
      },
    };
  }
  const sort = sorts[req.query.sort] || sorts.newest;
  const gemQuery = Gem.find(filter)
    .populate("createdBy", "name avatarUrl")
    .populate({ path: "curator", populate: { path: "user", select: "name avatarUrl" } });
  if (!nearest) gemQuery.sort(sort);
  const countFilter = { ...filter };
  if (nearest) delete countFilter.location;
  const [gems, total] = await Promise.all([
    gemQuery.skip(skip).limit(limit).lean(),
    Gem.countDocuments(countFilter),
  ]);
  res.json({ gems, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function listMyGems(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = { createdBy: req.user.id };
  if (["pending", "approved", "rejected"].includes(req.query.status)) filter.status = req.query.status;
  const [gems, total] = await Promise.all([
    Gem.find(filter).populate("createdBy", "name avatarUrl").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Gem.countDocuments(filter),
  ]);
  res.json({ gems, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function getGem(req, res) {
  validateId(req.params.id, "gem id");
  const gem = await Gem.findById(req.params.id)
    .populate("createdBy", "name avatarUrl")
    .populate({ path: "curator", populate: { path: "user", select: "name avatarUrl" } })
    .lean();
  if (!gem || !canViewGem(gem, req.user)) throw new ApiError(404, "Gem not found.");
  const [reviews, upvote, bookmark, updates] = await Promise.all([
    gem.status === "approved" ? Review.find({ gem: gem._id }).populate("user", "name avatarUrl").sort({ createdAt: -1 }).lean() : [],
    req.user ? Upvote.exists({ user: req.user.id, gem: gem._id }) : null,
    req.user ? Bookmark.exists({ user: req.user.id, gem: gem._id }) : null,
    gem.status === "approved" ? GemUpdate.find({ gem: gem._id }).populate({ path: "curator", populate: { path: "user", select: "name avatarUrl" } }).sort({ createdAt: -1 }).limit(10).lean() : [],
  ]);
  if (gem.status === "approved") {
    const view = await Gem.findOneAndUpdate(
      { _id: gem._id, status: "approved" },
      { $inc: { viewCount: 1 } },
      { new: true, projection: { viewCount: 1 } },
    ).lean();
    if (!view) throw new ApiError(404, "Gem not found.");
    gem.viewCount = view.viewCount;
  }
  res.json({ gem: { ...gem, reviews, curatorUpdates: updates, viewer: { upvoted: Boolean(upvote), bookmarked: Boolean(bookmark) } } });
}

export async function listReviews(req, res) {
  validateId(req.params.gemId, "gem id");
  const gem = await Gem.findOne({ _id: req.params.gemId, status: "approved" }).select("_id");
  if (!gem) throw new ApiError(404, "Gem not found.");
  const { page, limit, skip } = pagination(req.query);
  const [reviews, total] = await Promise.all([
    Review.find({ gem: gem._id }).populate("user", "name avatarUrl").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Review.countDocuments({ gem: gem._id }),
  ]);
  res.json({ reviews, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function createGem(req, res) {
  const body = normalizeGemBody(req.body);
  if (!body.title || !body.description || !body.category || !body.address || !body.location) throw new ApiError(400, "Title, description, category, address and location are required.");
  const gem = await Gem.create({ ...body, createdBy: req.user.id, status: req.user.role === "admin" ? "approved" : "pending" });
  res.status(201).json({ gem });
}

export async function updateGem(req, res) {
  validateId(req.params.id, "gem id");
  const gem = await Gem.findById(req.params.id);
  if (!gem) throw new ApiError(404, "Gem not found.");
  if (String(gem.createdBy) !== String(req.user.id) && req.user.role !== "admin") throw new ApiError(403, "You may only edit your own gems.");
  const updates = normalizeGemBody(req.body);
  if (Object.keys(updates).length === 0) throw new ApiError(400, "No editable fields provided.");
  Object.assign(gem, updates);
  if (req.user.role !== "admin") gem.status = "pending";
  await gem.save();
  res.json({ gem });
}

export async function deleteGem(req, res) {
  validateId(req.params.id, "gem id");
  const gem = await Gem.findById(req.params.id);
  if (!gem) throw new ApiError(404, "Gem not found.");
  if (String(gem.createdBy) !== String(req.user.id) && req.user.role !== "admin") throw new ApiError(403, "You may only delete your own gems.");
  await Promise.all([
    Gem.deleteOne({ _id: gem._id }),
    Upvote.deleteMany({ gem: gem._id }),
    Bookmark.deleteMany({ gem: gem._id }),
    BucketList.updateMany({ gems: gem._id }, { $pull: { gems: gem._id } }),
    GemClaim.deleteMany({ gem: gem._id }),
    GemUpdate.deleteMany({ gem: gem._id }),
    Review.deleteMany({ gem: gem._id }),
  ]);
  res.status(204).end();
}

export async function toggleUpvote(req, res) {
  validateId(req.params.id, "gem id");
  const gem = await Gem.findOne({ _id: req.params.id, status: "approved" });
  if (!gem) throw new ApiError(404, "Gem not found.");
  const removed = await Upvote.findOneAndDelete({ user: req.user.id, gem: gem._id });
  let upvoted = false;
  let upvoteCount;
  if (!removed) {
    try {
      await Upvote.create({ user: req.user.id, gem: gem._id });
      const updatedGem = await Gem.findByIdAndUpdate(gem._id, { $inc: { upvoteCount: 1 } }, { new: true });
      upvoted = true;
      upvoteCount = updatedGem.upvoteCount;
    } catch (error) {
      if (error.code !== 11000) throw error;
      upvoted = true;
      upvoteCount = (await Gem.findById(gem._id).select("upvoteCount").lean())?.upvoteCount || 0;
    }
  } else {
    const updatedGem = await Gem.findOneAndUpdate(
      { _id: gem._id, upvoteCount: { $gt: 0 } },
      { $inc: { upvoteCount: -1 } },
      { new: true },
    );
    upvoteCount = updatedGem?.upvoteCount ?? 0;
  }
  if (upvoted && [10, 25, 50, 100].includes(upvoteCount) && String(gem.createdBy) !== String(req.user.id)) {
    await Notification.create({ recipient: gem.createdBy, actor: req.user.id, type: "upvote", message: `Someone upvoted ${gem.title}.`, resourceType: "gem", resourceId: gem._id });
  }
  res.json({ upvoted, upvoteCount });
}

export async function addReview(req, res) {
  validateId(req.params.gemId, "gem id");
  const gem = await Gem.findOne({ _id: req.params.gemId, status: "approved" });
  if (!gem) throw new ApiError(404, "Gem not found.");
  if (!Number.isInteger(req.body.rating) || req.body.rating < 1 || req.body.rating > 5 || typeof req.body.comment !== "string" || req.body.comment.trim().length < 2 || req.body.comment.length > 2000) {
    throw new ApiError(400, "Rating (1–5) and a 2–2000 character comment are required.");
  }
  let review;
  try {
    review = await Review.create({ user: req.user.id, gem: gem._id, rating: req.body.rating, comment: req.body.comment.trim() });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, "You have already reviewed this place. Edit your existing review instead.");
    throw error;
  }
  await refreshReviewStats(gem._id);
  if (String(gem.createdBy) !== String(req.user.id)) {
    await Notification.create({ recipient: gem.createdBy, actor: req.user.id, type: "review", message: `A user reviewed ${gem.title}.`, resourceType: "review", resourceId: review._id });
  }
  res.status(201).json({ review });
}

async function refreshReviewStats(gemId) {
  const [stats] = await Review.aggregate([{ $match: { gem: gemId } }, { $group: { _id: "$gem", count: { $sum: 1 }, average: { $avg: "$rating" } } }]);
  await Gem.updateOne({ _id: gemId }, { $set: { reviewCount: stats?.count || 0, averageRating: stats ? Math.round(stats.average * 100) / 100 : 0 } });
}

export async function updateReview(req, res) {
  validateId(req.params.id, "review id");
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, "Review not found.");
  if (String(review.user) !== String(req.user.id) && req.user.role !== "admin") throw new ApiError(403, "You may only edit your own review.");
  if (req.body.rating !== undefined) {
    if (!Number.isInteger(req.body.rating) || req.body.rating < 1 || req.body.rating > 5) throw new ApiError(400, "Rating must be an integer from 1 to 5.");
    review.rating = req.body.rating;
  }
  if (req.body.comment !== undefined) {
    if (typeof req.body.comment !== "string" || req.body.comment.trim().length < 2 || req.body.comment.length > 2000) throw new ApiError(400, "Comment must be between 2 and 2000 characters.");
    review.comment = req.body.comment.trim();
  }
  await review.save();
  await refreshReviewStats(review.gem);
  res.json({ review });
}

export async function deleteReview(req, res) {
  validateId(req.params.id, "review id");
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, "Review not found.");
  if (String(review.user) !== String(req.user.id) && req.user.role !== "admin") throw new ApiError(403, "You may only delete your own review.");
  await Review.deleteOne({ _id: review._id });
  await refreshReviewStats(review.gem);
  res.status(204).end();
}
