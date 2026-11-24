import mongoose from "mongoose";

const bucketListSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    gems: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Gem" }],
      validate: { validator: (gems) => gems.length <= 100, message: "A list may contain at most 100 gems." },
    },
  },
  { timestamps: true },
);

bucketListSchema.index({ user: 1, title: 1 }, { unique: true });
bucketListSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model("BucketList", bucketListSchema);
