import mongoose from "mongoose";

const gemUpdateSchema = new mongoose.Schema(
  {
    gem: { type: mongoose.Schema.Types.ObjectId, ref: "Gem", required: true, index: true },
    curator: { type: mongoose.Schema.Types.ObjectId, ref: "CuratorProfile", required: true },
    message: { type: String, trim: true, maxlength: 1000 },
    openingHours: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

gemUpdateSchema.pre("validate", function validateUpdate(next) {
  if (!this.message && !this.openingHours) this.invalidate("message", "An update note or opening hours are required.");
  next();
});

export default mongoose.model("GemUpdate", gemUpdateSchema);
