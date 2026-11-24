import Upvote from "../models/Upvote.js";
import { pagination } from "../utils/validation.js";

export async function listMyUpvotes(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const [rows, total] = await Promise.all([
    Upvote.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "gem", match: { status: "approved" }, populate: { path: "createdBy", select: "name avatarUrl" } })
      .lean(),
    Upvote.countDocuments({ user: req.user.id }),
  ]);
  res.json({
    gems: rows.map((row) => row.gem).filter(Boolean),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
