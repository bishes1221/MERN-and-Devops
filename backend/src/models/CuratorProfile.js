import mongoose from "mongoose";

const curatorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bio: { type: String, required: true, trim: true, minlength: 20, maxlength: 1000 },
    specialties: [{ type: String, trim: true, maxlength: 60 }],
    website: { type: String, trim: true, maxlength: 2048 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  { timestamps: true },
);

export default mongoose.model("CuratorProfile", curatorProfileSchema);
