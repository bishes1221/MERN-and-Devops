import CuratorProfile from "../models/CuratorProfile.js";
import Gem from "../models/Gem.js";
import Review from "../models/Review.js";
import User from "../models/User.js";

export async function getPublicStats(req, res) {
  const [gemsMapped, tipsShared, explorers, curators, neighborhoods, profiles] = await Promise.all([
    Gem.countDocuments({ status: "approved" }),
    Review.countDocuments(),
    User.countDocuments({ role: "explorer", isActive: true }),
    CuratorProfile.countDocuments({ status: "approved" }),
    Gem.aggregate([
      { $match: { status: "approved" } },
      {
        $project: {
          neighborhood: {
            $toLower: {
              $trim: { input: { $arrayElemAt: [{ $split: ["$address", ","] }, 0] } },
            },
          },
        },
      },
      { $match: { neighborhood: { $ne: "" } } },
      { $group: { _id: "$neighborhood" } },
      { $count: "count" },
    ]),
    CuratorProfile.find({ status: "approved" })
      .populate("user", "name avatarUrl")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);
  const profileIds = profiles.map((profile) => profile._id);
  const userIds = profiles.map((profile) => profile.user?._id).filter(Boolean);
  const [userGemStats, managedGemStats, recentTips] = await Promise.all([
    userIds.length ? Gem.aggregate([
      { $match: { status: "approved", createdBy: { $in: userIds } } },
      { $group: { _id: "$createdBy", gemCount: { $sum: 1 }, points: { $sum: "$upvoteCount" } } },
    ]) : [],
    profileIds.length ? Gem.aggregate([
      { $match: { status: "approved", curator: { $in: profileIds } } },
      { $group: { _id: "$curator", gemCount: { $sum: 1 }, points: { $sum: "$upvoteCount" } } },
    ]) : [],
    Review.find().populate("user", "name").populate("gem", "title").sort({ createdAt: -1 }).limit(3).lean(),
  ]);
  const userStats = new Map(userGemStats.map((row) => [String(row._id), row]));
  const managedStats = new Map(managedGemStats.map((row) => [String(row._id), row]));
  const featuredCurators = profiles
    .filter((profile) => profile.user)
    .map((profile) => {
      const authored = userStats.get(String(profile.user._id));
      const managed = managedStats.get(String(profile._id));
      return {
        _id: profile._id,
        user: profile.user,
        bio: profile.bio,
        specialties: profile.specialties,
        gemCount: (authored?.gemCount || 0) + (managed?.gemCount || 0),
        points: (authored?.points || 0) + (managed?.points || 0),
      };
    })
    .sort((a, b) => b.points - a.points || b.gemCount - a.gemCount)
    .slice(0, 6);

  res.json({
    stats: {
      gemsMapped,
      neighborhoodsCovered: neighborhoods[0]?.count || 0,
      tipsShared,
      explorers,
      curators,
    },
    featuredCurators,
    recentTips,
  });
}
