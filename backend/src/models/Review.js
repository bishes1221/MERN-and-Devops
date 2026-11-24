import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gem: { type: mongoose.Schema.Types.ObjectId, ref: "Gem", required: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    comment: { type: String, required: true, trim: true, minlength: 2, maxlength: 2000 },
  },
  { timestamps: true },
);

reviewSchema.index({ user: 1, gem: 1 }, { unique: true });
reviewSchema.index({ gem: 1, createdAt: -1 });

export default mongoose.model("Review", reviewSchema);
