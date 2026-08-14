import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/token";
import { User } from "../models/User";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  // Populated alongside userId so activity/notification messages (e.g.
  // "Sarah moved \"Dashboard UI\" to Review") don't need a separate User
  // lookup in every controller that writes one - one query here covers it.
  authUser?: { name: string };
}

/**
 * Requires a valid short-lived access token in the Authorization header
 * (Bearer scheme). Attaches the authenticated user's id (and name, for
 * activity/notification messages) to the request. Does NOT touch the
 * refresh token cookie - that is only read by POST /api/auth/refresh.
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

    const user = await User.findById(payload.sub).select("name").lean();
    if (!user) {
      throw AppError.unauthorized("User no longer exists");
    }

    req.userId = payload.sub;
    req.authUser = { name: user.name };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(AppError.unauthorized("Invalid or expired access token"));
  }
}
