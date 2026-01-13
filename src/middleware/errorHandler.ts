import env, { isDev } from "../../env.ts";
import type { Request, Response, NextFunction } from "express";

export type CustomError = Error & {
  status?: number;
  code?: string;
};

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let status = err.status || 500;
  let message = err.message || "Internal Server Error";

  // Extract PostgreSQL error details if available
  const pgError = (err as any).cause || (err as any).original;
  if (pgError) {
    // PostgreSQL errors have a 'detail' or 'message' property
    const pgMessage = pgError.detail || pgError.message || pgError.code;
    if (pgMessage) {
      message = pgMessage;
      // Handle specific PostgreSQL error codes
      if (pgError.code === "23505") {
        // Unique violation
        status = 409;
        message = "Resource already exists";
      } else if (pgError.code === "23503") {
        // Foreign key violation
        status = 400;
        message = "Invalid reference to related resource";
      } else if (pgError.code === "22P02") {
        // Invalid input syntax (e.g., invalid UUID)
        status = 400;
        message = "Invalid ID format";
      }
    }
  }

  if (err.name === "ValidationError") {
    status = 400;
    message = err.message || "Validation Error";
  }

  if (err.name === "UnauthorizedError") {
    status = 401;
    message = err.message || "Unauthorized";
  }

  if (err.name === "ForbiddenError") {
    status = 403;
    message = "Forbidden";
  }

  if (err.name === "NotFoundError") {
    status = 404;
    message = err.message || "Resource not found";
  }

  res.status(status).json({
    error: message,
    ...(isDev() && {
      stack: err.stack,
      details: err.message,
      ...(pgError && { databaseError: pgError.message || pgError.detail }),
    }),
    ...(env.APP_STAGE === "staging" && {
      details: err.message,
    }),
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not found - ${req.originalUrl}`) as CustomError;
  error.status = 404;
  next(error);
};
