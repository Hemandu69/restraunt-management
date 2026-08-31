import jwt from "jsonwebtoken";
import { Role } from "../constants/roles";
import { env } from "../config/env";

export interface AuthTokenPayload {
  sub: string; // user id
  role: Role;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}
