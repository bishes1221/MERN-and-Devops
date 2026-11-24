import { uploadImage } from "../services/cloudinary.js";

export async function uploadImages(req, res) {
  const images = await Promise.all(req.uploadFiles.map((file) => uploadImage(file.buffer)));
  res.status(201).json({ images });
}
