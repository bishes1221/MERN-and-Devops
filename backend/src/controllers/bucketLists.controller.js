import BucketList from "../models/BucketList.js";
import Gem from "../models/Gem.js";
import ApiError from "../utils/ApiError.js";
import { validateId } from "../utils/validation.js";

const populatedGems = {
  path: "gems",
  match: { status: "approved" },
  populate: { path: "createdBy", select: "name avatarUrl" },
};

function validateTitle(value) {
  if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > 60) {
    throw new ApiError(400, "List title must be between 2 and 60 characters.");
  }
}

export async function listBucketLists(req, res) {
  const lists = await BucketList.find({ user: req.user.id })
    .populate(populatedGems)
    .sort({ updatedAt: -1 })
    .lean();
  res.json({ lists: lists.map((list) => ({ ...list, gemCount: list.gems.length })) });
}

export async function getBucketList(req, res) {
  validateId(req.params.id, "bucket list id");
  const list = await BucketList.findOne({ _id: req.params.id, user: req.user.id })
    .populate(populatedGems)
    .lean();
  if (!list) throw new ApiError(404, "Bucket list not found.");
  res.json({ list: { ...list, gemCount: list.gems.length } });
}

export async function createBucketList(req, res) {
  validateTitle(req.body.title);
  if (req.body.description !== undefined && (typeof req.body.description !== "string" || req.body.description.length > 300)) {
    throw new ApiError(400, "List description must be at most 300 characters.");
  }
  if (await BucketList.countDocuments({ user: req.user.id }) >= 50) throw new ApiError(400, "You may create up to 50 bucket lists.");
  const list = await BucketList.create({
    user: req.user.id,
    title: req.body.title.trim(),
    description: req.body.description?.trim(),
  });
  res.status(201).json({ list });
}

export async function updateBucketList(req, res) {
  validateId(req.params.id, "bucket list id");
  const updates = {};
  if (req.body.title !== undefined) {
    validateTitle(req.body.title);
    updates.title = req.body.title.trim();
  }
  if (req.body.description !== undefined) {
    if (typeof req.body.description !== "string" || req.body.description.length > 300) {
      throw new ApiError(400, "List description must be at most 300 characters.");
    }
    updates.description = req.body.description.trim();
  }
  if (!Object.keys(updates).length) throw new ApiError(400, "No bucket list fields were provided.");
  const list = await BucketList.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $set: updates },
    { new: true, runValidators: true },
  ).populate(populatedGems);
  if (!list) throw new ApiError(404, "Bucket list not found.");
  res.json({ list });
}

export async function deleteBucketList(req, res) {
  validateId(req.params.id, "bucket list id");
  const result = await BucketList.deleteOne({ _id: req.params.id, user: req.user.id });
  if (!result.deletedCount) throw new ApiError(404, "Bucket list not found.");
  res.status(204).end();
}

export async function addGemToBucketList(req, res) {
  validateId(req.params.id, "bucket list id");
  validateId(req.params.gemId, "gem id");
  const [list, gem] = await Promise.all([
    BucketList.findOne({ _id: req.params.id, user: req.user.id }),
    Gem.findOne({ _id: req.params.gemId, status: "approved" }).select("_id"),
  ]);
  if (!list) throw new ApiError(404, "Bucket list not found.");
  if (!gem) throw new ApiError(404, "Approved gem not found.");
  if (!list.gems.some((id) => String(id) === String(gem._id)) && list.gems.length >= 100) {
    throw new ApiError(400, "A list may contain at most 100 gems.");
  }
  await BucketList.updateOne(
    { _id: list._id, user: req.user.id },
    { $addToSet: { gems: gem._id } },
  );
  res.json({ added: true });
}

export async function removeGemFromBucketList(req, res) {
  validateId(req.params.id, "bucket list id");
  validateId(req.params.gemId, "gem id");
  const result = await BucketList.updateOne(
    { _id: req.params.id, user: req.user.id },
    { $pull: { gems: req.params.gemId } },
  );
  if (!result.matchedCount) throw new ApiError(404, "Bucket list not found.");
  res.status(204).end();
}
