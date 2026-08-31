import { NextFunction, Request, Response } from "express";
import { Role, UserStatus } from "../constants/roles";
import { verifyAuthToken } from "../auth/jwt";
import { env } from "../config/env";
import { prisma } from "../config/database";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// 1. Extracts the token from the auth cookie (or Authorization header as a
//    fallback for non-browser clients).
// 2. Validates it.
// 3. Loads the current user from the database.
// 4. Rejects unauthenticated / deactivated users.
// 5. Attaches the safe user object to req.user for downstream handlers.
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const cookieToken = req.cookies?.[env.authCookieName];
  const headerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice("Bearer ".length)
    : undefined;
  const token = cookieToken ?? headerToken;

  if (!token) {
    throw ApiError.unauthenticated("No authentication token was provided.");
  }

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    throw ApiError.unauthenticated("Your session is invalid or has expired.");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw ApiError.unauthenticated("Your session is invalid or has expired.");
  }
  if (user.status !== UserStatus.ACTIVE) {
    throw ApiError.unauthenticated("This account is deactivated.");
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    status: user.status as UserStatus,
  };

  next();
});
