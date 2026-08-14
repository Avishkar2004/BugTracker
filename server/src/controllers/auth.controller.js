import User, { ROLES } from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { signToken } from "../middleware/auth.js";

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    throw ApiError.badRequest("Name, email and password are all required");
  }

  // The very first account to register becomes the admin.
  const isFirstUser = (await User.estimatedDocumentCount()) === 0;
  const requestedRole = ROLES.includes(role) ? role : "reporter";

  const user = await User.create({
    name,
    email,
    password,
    role: isFirstUser ? "admin" : requestedRole,
  });

  res.status(201).json({ token: signToken(user._id), user: user.toJSON() });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest("Email and password are required");

  const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Incorrect email or password");
  }

  res.json({ token: signToken(user._id), user: user.toJSON() });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toJSON() });
});
