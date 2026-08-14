import User, { ROLES } from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ name: 1 });
  res.json({ users });
});

export const updateRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!ROLES.includes(role)) throw ApiError.badRequest(`Role must be one of: ${ROLES.join(", ")}`);

  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest("You cannot change your own role");
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  );
  if (!user) throw ApiError.notFound("User not found");

  res.json({ user });
});
