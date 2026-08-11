import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/token";
import { User } from "../models/User";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Requires a valid short-lived access token in the Authorization header
 * (Bearer scheme). Attaches the authenticated user's id to req.userId.
 * Does NOT touch the refresh token cookie - that is only read by
 * POST /api/auth/refresh.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw AppError.unauthorized("Missing or malformed Authorization header");
    }
    const token = header.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    const userExists = await User.exists({ _id: payload.sub });
    if (!userExists) {
      throw AppError.unauthorized("User no longer exists");
    }

    req.userId = payload.sub;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(AppError.unauthorized("Invalid or expired access token"));
  }
}
