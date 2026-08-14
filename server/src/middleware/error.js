import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || "Something went wrong";
  let details = err.details;

  if (err.name === "ValidationError" && err.errors) {
    status = 400;
    details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    );
    message = "Validation failed";
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid value for "${err.path}"`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || { value: 1 })[0];
    message = `That ${field} is already taken`;
  } else if (err.name === "JsonWebTokenError") {
    status = 401;
    message = "Invalid authentication token";
  } else if (err.name === "TokenExpiredError") {
    status = 401;
    message = "Your session has expired, please log in again";
  } else if (err.code === "LIMIT_FILE_SIZE") {
    status = 413;
    message = `File is too large (max ${env.maxUploadMb} MB)`;
  }

  if (status >= 500) console.error(err);

  res.status(status).json({
    error: message,
    ...(details ? { details } : {}),
    ...(env.nodeEnv === "development" && status >= 500 ? { stack: err.stack } : {}),
  });
}
