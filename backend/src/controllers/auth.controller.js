import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

const publicUser = (user) => {
  const value = user.toObject ? user.toObject() : { ...user };
  delete value.password;
  delete value.__v;
  return value;
};

function issueCookie(res, user) {
  if (!process.env.JWT_SECRET) throw new ApiError(503, "Authentication is unavailable: configure JWT_SECRET.");
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function register(req, res) {
  const { name, email, password } = req.body;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) throw new ApiError(400, "Name must be between 2 and 80 characters.");
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new ApiError(400, "A valid email is required.");
  if (typeof password !== "string" || password.length < 8 || password.length > 128 || Buffer.byteLength(password, "utf8") > 72) throw new ApiError(400, "Password must be 8–72 UTF-8 bytes.");
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) throw new ApiError(409, "An account with that email already exists.");
  const user = await User.create({ name: name.trim(), email: normalizedEmail, password: await bcrypt.hash(password, 12) });
  issueCookie(res, user);
  res.status(201).json({ user: publicUser(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (typeof email !== "string" || email.length > 254 || typeof password !== "string" || password.length > 128 || Buffer.byteLength(password, "utf8") > 72) throw new ApiError(400, "A valid email and password are required.");
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) throw new ApiError(401, "Email or password is incorrect.");
  issueCookie(res, user);
  res.json({ user: publicUser(user) });
}

export function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res.json({ message: "Logged out." });
}

export function me(req, res) {
  res.json({ user: req.user ? publicUser(req.user) : null });
}
