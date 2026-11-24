import mongoose from "mongoose";

const gemClaimSchema = new mongoose.Schema(
  {
    gem: { type: mongoose.Schema.Types.ObjectId, ref: "Gem", required: true, index: true },
    curator: { type: mongoose.Schema.Types.ObjectId, ref: "CuratorProfile", required: true, index: true },
    details: { type: String, required: true, trim: true, minlength: 20, maxlength: 1500 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewNote: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  { timestamps: true },
);

gemClaimSchema.index(
  { gem: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);

export default mongoose.model("GemClaim", gemClaimSchema);
