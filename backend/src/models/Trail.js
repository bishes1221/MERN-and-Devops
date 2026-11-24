import mongoose from "mongoose";

const trailSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    difficulty: { type: String, enum: ["easy", "moderate", "challenging"], default: "easy" },
    durationMinutes: { type: Number, min: 1, max: 1440 },
    route: {
      type: { type: String, enum: ["LineString"], default: "LineString" },
      coordinates: {
        type: [[Number]],
        validate: {
          validator: (coordinates) => coordinates.length === 0 || coordinates.every((point) => point.length === 2 && point[0] >= -180 && point[0] <= 180 && point[1] >= -90 && point[1] <= 90),
          message: "Trail route coordinates must be valid [longitude, latitude] pairs.",
        },
      },
    },
    stops: [{ type: mongoose.Schema.Types.ObjectId, ref: "Gem" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
  },
  { timestamps: true },
);

trailSchema.index({ route: "2dsphere" });

export default mongoose.model("Trail", trailSchema);
