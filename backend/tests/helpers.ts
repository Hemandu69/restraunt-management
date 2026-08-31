import { Role, UserStatus } from "../src/constants/roles";
import { prisma } from "../src/config/database";
import { hashPassword } from "../src/auth/password";

export const DEFAULT_PASSWORD = "Password123!";

export async function createTestUser(overrides: {
  role: Role;
  status?: UserStatus;
  email?: string;
  name?: string;
}) {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  return prisma.user.create({
    data: {
      name: overrides.name ?? `${overrides.role} Test User`,
      email: overrides.email ?? `${overrides.role.toLowerCase()}-${Date.now()}-${Math.random()}@example.com`,
      passwordHash,
      role: overrides.role,
      status: overrides.status ?? UserStatus.ACTIVE,
    },
  });
}
