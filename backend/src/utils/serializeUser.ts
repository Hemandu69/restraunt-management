import { User } from "@prisma/client";
import { Role, UserStatus } from "../constants/roles";

// The only place a User row is turned into API-facing JSON. Guarantees
// passwordHash and any future sensitive fields can never leak in a response.
export function serializeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    status: user.status as UserStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export type SafeUser = ReturnType<typeof serializeUser>;
