import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gem: { type: mongoose.Schema.Types.ObjectId, ref: "Gem", required: true },
    reason: { type: String, required: true, enum: ["inaccurate", "closed", "inappropriate", "duplicate", "other"] },
    details: { type: String, trim: true, maxlength: 1500 },
    status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  { timestamps: true },
);

reportSchema.index({ reporter: 1, gem: 1, status: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);
