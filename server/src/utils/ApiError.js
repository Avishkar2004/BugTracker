export default class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, details) {
    return new ApiError(400, msg, details);
  }
  static unauthorized(msg = "Not authenticated") {
    return new ApiError(401, msg);
  }
  static forbidden(msg = "You do not have permission to do that") {
    return new ApiError(403, msg);
  }
  static notFound(msg = "Resource not found") {
    return new ApiError(404, msg);
  }
}
