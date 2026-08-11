import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

/**
 * Centralized Express error handler. Must be registered last, after all routes.
 * Normalizes known AppErrors, Mongoose errors, and JWT errors into a consistent
 * { success: false, message } shape and never leaks stack traces in production.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = "Internal server error";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    if (err.name === "ValidationError") {
      statusCode = 400;
      message = err.message;
    } else if (err.name === "CastError") {
      statusCode = 400;
      message = "Invalid identifier supplied";
    } else if ((err as { code?: number }).code === 11000) {
      statusCode = 409;
      message = "Duplicate value violates a unique constraint";
    } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Invalid or expired token";
    } else {
      message = env.isProduction ? message : err.message;
    }
  }

  if (!env.isProduction && statusCode === 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({ success: false, message });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}
