export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = error.status || 500;
  let message = error.message || "An unexpected server error occurred.";
  let details = error.details;

  if (error.name === "ValidationError") {
    status = 400;
    message = "Request validation failed.";
    details = Object.values(error.errors).map(({ path, message: reason }) => ({ field: path, message: reason }));
  } else if (error.code === 11000) {
    status = 409;
    message = "A record with that value already exists.";
  } else if (error.name === "CastError") {
    status = 400;
    message = "Invalid identifier or value.";
  } else if (error.type === "entity.too.large") {
    status = 413;
    message = "Request body is too large.";
  } else if (error.code === "LIMIT_FILE_SIZE") {
    status = 413;
    message = "Each uploaded image must be no larger than 5 MB.";
  } else if (error.name === "MulterError") {
    status = 400;
    message = error.code === "LIMIT_FILE_COUNT" ? "Too many image files." : "Invalid image upload.";
  } else if (error instanceof SyntaxError && "body" in error) {
    status = 400;
    message = "Malformed JSON request body.";
  }

  if (status >= 500) console.error(error);
  res.status(status).json({
    error: {
      message: process.env.NODE_ENV === "production" && status >= 500 ? "An unexpected server error occurred." : message,
      ...(details ? { details } : {}),
    },
  });
}
