import CuratorProfile from "../models/CuratorProfile.js";
import GemClaim from "../models/GemClaim.js";
import Gem from "../models/Gem.js";
import Notification from "../models/Notification.js";
import Report from "../models/Report.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import ApiError from "../utils/ApiError.js";
import { pagination, validateId } from "../utils/validation.js";

export async function listPendingGems(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const [gems, total] = await Promise.all([
    Gem.find({ status: "pending" }).populate("createdBy", "name email").sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    Gem.countDocuments({ status: "pending" }),
  ]);
  res.json({ gems, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function moderateGem(req, res) {
  validateId(req.params.id, "gem id");
  if (!["approved", "rejected"].includes(req.body.status)) throw new ApiError(400, "Status must be approved or rejected.");
  const gem = await Gem.findById(req.params.id);
  if (!gem) throw new ApiError(404, "Gem not found.");
  gem.status = req.body.status;
  gem.moderationNote = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 1000) : undefined;
  await gem.save();
  await Notification.create({
    recipient: gem.createdBy,
    actor: req.user.id,
    type: req.body.status === "approved" ? "gem_approved" : "gem_rejected",
    message: req.body.status === "approved" ? `Your gem “${gem.title}” has been approved.` : `Your gem “${gem.title}” was not approved.`,
    resourceType: "gem",
    resourceId: gem._id,
  });
  res.json({ gem });
}

export async function listUsers(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const [users, total] = await Promise.all([
    User.find().select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(),
  ]);
  res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function updateUser(req, res) {
  validateId(req.params.id, "user id");
  const updates = {};
  if (req.body.role !== undefined) {
    if (!["explorer", "curator", "admin"].includes(req.body.role)) throw new ApiError(400, "Invalid role.");
    if (String(req.params.id) === String(req.user.id) && req.body.role !== "admin") throw new ApiError(400, "You cannot revoke your own administrator role.");
    updates.role = req.body.role;
  }
  if (req.body.isActive !== undefined) {
    if (typeof req.body.isActive !== "boolean") throw new ApiError(400, "isActive must be a boolean.");
    if (String(req.params.id) === String(req.user.id) && req.body.isActive === false) throw new ApiError(400, "You cannot deactivate your own account.");
    updates.isActive = req.body.isActive;
  }
  if (!Object.keys(updates).length) throw new ApiError(400, "No supported user fields provided.");
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select("-password");
  if (!user) throw new ApiError(404, "User not found.");
  res.json({ user });
}

export async function stats(req, res) {
  const [users, gems, approvedGems, pendingGems, reports, openReports, curators, upvotes, tips] = await Promise.all([
    User.countDocuments(),
    Gem.countDocuments(),
    Gem.countDocuments({ status: "approved" }),
    Gem.countDocuments({ status: "pending" }),
    Report.countDocuments(),
    Report.countDocuments({ status: "open" }),
    CuratorProfile.countDocuments({ status: "approved" }),
    Gem.aggregate([{ $match: { status: "approved" } }, { $group: { _id: null, total: { $sum: "$upvoteCount" } } }]),
    Review.countDocuments(),
  ]);
  res.json({ stats: { users, gems, approvedGems, pendingGems, reports, openReports, curators, upvotes: upvotes[0]?.total || 0, tips } });
}

export async function listReports(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (["open", "resolved", "dismissed"].includes(req.query.status)) filter.status = req.query.status;
  const [reports, total] = await Promise.all([
    Report.find(filter).populate("reporter", "name email").populate("gem", "title status").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Report.countDocuments(filter),
  ]);
  res.json({ reports, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function updateReport(req, res) {
  validateId(req.params.id, "report id");
  if (!["resolved", "dismissed", "open"].includes(req.body.status)) throw new ApiError(400, "Invalid report status.");
  const report = await Report.findByIdAndUpdate(req.params.id, {
    $set: { status: req.body.status, reviewedBy: req.user.id, reviewedAt: new Date() },
  }, { new: true, runValidators: true });
  if (!report) throw new ApiError(404, "Report not found.");
  res.json({ report });
}

export async function listCuratorApplications(req, res) {
  const profiles = await CuratorProfile.find({ status: "pending" }).populate("user", "name email createdAt").sort({ createdAt: 1 }).lean();
  res.json({ curators: profiles });
}

export async function moderateCurator(req, res) {
  validateId(req.params.id, "curator profile id");
  if (!["approved", "rejected"].includes(req.body.status)) throw new ApiError(400, "Status must be approved or rejected.");
  const profile = await CuratorProfile.findById(req.params.id);
  if (!profile) throw new ApiError(404, "Curator application not found.");
  profile.status = req.body.status;
  profile.reviewedBy = req.user.id;
  profile.reviewedAt = new Date();
  await profile.save();
  await User.updateOne(
    { _id: profile.user, role: { $ne: "admin" } },
    { $set: { role: req.body.status === "approved" ? "curator" : "explorer" } },
  );
  await Notification.create({
    recipient: profile.user,
    actor: req.user.id,
    type: "curator_status",
    message: req.body.status === "approved" ? "Your curator application has been approved." : "Your curator application was not approved.",
    resourceType: "curator",
    resourceId: profile._id,
  });
  res.json({ curator: profile });
}

export async function listGemClaims(req, res) {
  const claims = await GemClaim.find({ status: "pending" })
    .populate({ path: "gem", select: "title address status curator" })
    .populate({ path: "curator", populate: { path: "user", select: "name email" } })
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();
  res.json({ claims });
}

export async function moderateGemClaim(req, res) {
  validateId(req.params.id, "claim id");
  if (!["approved", "rejected"].includes(req.body.status)) throw new ApiError(400, "Status must be approved or rejected.");
  if (req.body.note !== undefined && (typeof req.body.note !== "string" || req.body.note.length > 1000)) {
    throw new ApiError(400, "Review note must be at most 1000 characters.");
  }
  const claim = await GemClaim.findById(req.params.id);
  if (!claim || claim.status !== "pending") throw new ApiError(404, "Pending claim not found.");
  const profile = await CuratorProfile.findById(claim.curator).select("_id user status");
  if (!profile) throw new ApiError(404, "Curator profile not found.");
  if (req.body.status === "approved") {
    if (profile.status !== "approved") throw new ApiError(409, "The curator is no longer approved.");
    const gem = await Gem.findOne({ _id: claim.gem, status: "approved" }).select("curator");
    if (!gem || (gem.curator && String(gem.curator) !== String(profile._id))) {
      throw new ApiError(409, "This place is no longer available to be claimed.");
    }
  }
  const reviewedAt = new Date();
  const updatedClaim = await GemClaim.findOneAndUpdate(
    { _id: claim._id, status: "pending" },
    { $set: { status: req.body.status, reviewNote: req.body.note?.trim(), reviewedBy: req.user.id, reviewedAt } },
    { new: true, runValidators: true },
  );
  if (!updatedClaim) throw new ApiError(409, "This claim has already been reviewed.");
  if (req.body.status === "approved") {
    const assignment = await Gem.updateOne(
      { _id: claim.gem, status: "approved", $or: [{ curator: profile._id }, { curator: { $exists: false } }, { curator: null }] },
      { $set: { curator: profile._id } },
    );
    if (!assignment.matchedCount) {
      await GemClaim.updateOne(
        { _id: claim._id, status: "approved" },
        { $set: { status: "pending" }, $unset: { reviewedBy: 1, reviewedAt: 1, reviewNote: 1 } },
      );
      throw new ApiError(409, "This place was claimed by another curator before approval.");
    }
  }
  await Notification.create({
    recipient: profile.user,
    actor: req.user.id,
    type: "curator_claim",
    message: req.body.status === "approved" ? "Your place ownership claim was approved." : "Your place ownership claim was declined.",
    resourceType: "gem",
    resourceId: claim.gem,
  });
  res.json({ claim: updatedClaim });
}
