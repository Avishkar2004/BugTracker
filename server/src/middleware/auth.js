import jwt from "jsonwebtoken";
import env from "../config/env.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/** Requires a valid `Authorization: Bearer <token>` header. */
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) throw ApiError.unauthorized("Missing authentication token");

  const payload = jwt.verify(token, env.jwtSecret);
  const user = await User.findById(payload.sub);
  if (!user)
    throw ApiError.unauthorized("The user for this token no longer exists");

  req.user = user;
  next();
});

/** Restricts a route to the listed roles. Must run after `protect`. */
export function restrictTo(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`This action requires one of: ${roles.join(", ")}`),
      );
    }
    next();
  };
}
