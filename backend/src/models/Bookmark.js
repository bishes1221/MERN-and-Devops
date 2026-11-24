import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gem: { type: mongoose.Schema.Types.ObjectId, ref: "Gem", required: true },
  },
  { timestamps: true },
);

bookmarkSchema.index({ user: 1, gem: 1 }, { unique: true });
bookmarkSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Bookmark", bookmarkSchema);
