import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    publicId: { type: String, trim: true, maxlength: 255 },
    width: { type: Number, min: 1, max: 20000 },
    height: { type: Number, min: 1, max: 20000 },
    format: { type: String, trim: true, maxlength: 20 },
  },
  { _id: false },
);

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return value.length === 2 && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90;
        },
        message: "Coordinates must be [longitude, latitude] within valid bounds.",
      },
    },
  },
  { _id: false },
);

const gemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 5000 },
    category: { type: String, required: true, trim: true, lowercase: true, maxlength: 60, index: true },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    location: { type: pointSchema, required: true },
    images: {
      type: [imageSchema],
      default: [],
      validate: { validator: (images) => images.length <= 12, message: "A gem may have at most 12 images." },
    },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
    priceLevel: { type: Number, min: 0, max: 3, default: 0 },
    bestTimeToVisit: { type: String, trim: true, maxlength: 120 },
    insiderTip: { type: String, trim: true, maxlength: 1000 },
    openingHours: { type: String, trim: true, maxlength: 500 },
    website: { type: String, trim: true, maxlength: 2048 },
    phone: { type: String, trim: true, maxlength: 40 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    curator: { type: mongoose.Schema.Types.ObjectId, ref: "CuratorProfile", index: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    moderationNote: { type: String, trim: true, maxlength: 1000 },
    upvoteCount: { type: Number, min: 0, default: 0 },
    viewCount: { type: Number, min: 0, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
  },
  { timestamps: true },
);

gemSchema.index({ location: "2dsphere" });
gemSchema.index({ status: 1, category: 1, createdAt: -1 });
gemSchema.index({ title: "text", description: "text", address: "text", tags: "text" });

export default mongoose.model("Gem", gemSchema);
