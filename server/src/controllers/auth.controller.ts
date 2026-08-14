import { Response } from "express";
import { env } from "../config/env";
import { catchAsync } from "../utils/catchAsync";
import { sendSuccess } from "../utils/apiResponse";
import { authService } from "../services/auth.service";
import { REFRESH_COOKIE_NAME } from "../utils/token";
import { AuthenticatedRequest } from "../middleware/auth";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: "none" as const,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, REFRESH_COOKIE_OPTIONS);
}

export const authController = {
  register: catchAsync(async (req, res) => {
    const { name, email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.register(name, email, password);
    setRefreshCookie(res, refreshToken);
    sendSuccess(res, { user, accessToken }, "Account created successfully", 201);
  }),

  login: catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(email, password);
    setRefreshCookie(res, refreshToken);
    sendSuccess(res, { user, accessToken }, "Logged in successfully");
  }),

  logout: catchAsync(async (_req, res) => {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    sendSuccess(res, null, "Logged out successfully");
  }),

  refresh: catchAsync(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      res.status(401).json({ success: false, message: "No refresh token provided" });
      return;
    }
    const { accessToken } = await authService.refresh(token);
    sendSuccess(res, { accessToken }, "Access token refreshed");
  }),

  me: catchAsync(async (req: AuthenticatedRequest, res) => {
    const user = await authService.me(req.userId as string);
    sendSuccess(res, { user }, "Current user retrieved");
  }),
};
