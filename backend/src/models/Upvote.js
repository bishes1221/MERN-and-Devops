import mongoose from "mongoose";

const upvoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gem: { type: mongoose.Schema.Types.ObjectId, ref: "Gem", required: true },
  },
  { timestamps: true },
);

upvoteSchema.index({ user: 1, gem: 1 }, { unique: true });

export default mongoose.model("Upvote", upvoteSchema);
