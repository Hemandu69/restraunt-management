import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { loginSchema } from "../validation/auth.schemas";
import { loginWithEmailAndPassword } from "../services/auth.service";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax" as const,
  maxAge: 24 * 60 * 60 * 1000, // 1 day, matches default JWT_EXPIRES_IN
  path: "/",
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  const { token, user } = await loginWithEmailAndPassword(email, password);

  res.cookie(env.authCookieName, token, AUTH_COOKIE_OPTIONS);

  res.status(200).json({
    success: true,
    data: {
      user,
      // The app authenticates via an httpOnly JWT cookie set on this
      // response; the token is echoed here too so non-browser clients
      // (tests, curl, mobile) can use it as a Bearer token instead.
      authMechanism: "JWT",
      token,
    },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthenticated();
  }
  res.status(200).json({ success: true, data: { user: req.user } });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(env.authCookieName, { path: "/" });
  res.status(200).json({ success: true, data: { message: "Logged out." } });
});
