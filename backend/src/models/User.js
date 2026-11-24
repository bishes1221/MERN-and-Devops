import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["explorer", "curator", "admin"], default: "explorer", index: true },
    avatarUrl: { type: String, trim: true, maxlength: 2048 },
    bio: { type: String, trim: true, maxlength: 1000, default: "" },
    neighborhood: { type: String, trim: true, maxlength: 100 },
    favoriteCategories: [{ type: String, trim: true, maxlength: 60 }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
