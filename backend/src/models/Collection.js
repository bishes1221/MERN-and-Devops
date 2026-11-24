import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    coverUrl: { type: String, trim: true, maxlength: 2048 },
    gems: [{ type: mongoose.Schema.Types.ObjectId, ref: "Gem" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
  },
  { timestamps: true },
);

export default mongoose.model("Collection", collectionSchema);
