import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, required: true, enum: ["gem_approved", "gem_rejected", "review", "upvote", "curator_status", "curator_claim", "system"] },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    resourceType: { type: String, enum: ["gem", "review", "curator"] },
    resourceId: mongoose.Schema.Types.ObjectId,
    readAt: Date,
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
