import { Role, UserStatus } from "../constants/roles";
import { prisma } from "../config/database";
import { hashPassword } from "../auth/password";
import { ApiError } from "../utils/ApiError";
import { serializeUser } from "../utils/serializeUser";

export interface CreateWaiterInput {
  name: string;
  email: string;
  password: string;
}

// Public-facing "create account" flow used by Manager-only routes. The role
// is hard-coded to WAITER here - it is never read from client input - so no
// request body can be crafted to self-promote to MANAGER through this path.
export async function createWaiterUser(input: CreateWaiterInput) {
  const email = input.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict("A user with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash,
      role: Role.WAITER,
      status: UserStatus.ACTIVE,
    },
  });

  return serializeUser(user);
}

// Lists every account (Manager and Waiter alike) so the Manager-facing
// Waiters screen can show the Manager's own row too.
export async function listWaiters() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return users.map(serializeUser);
}

export async function getWaiterById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw ApiError.notFound("User not found.");
  }
  return serializeUser(user);
}

export interface UpdateWaiterInput {
  name?: string;
  email?: string;
  role?: Role;
}

// `actingUserId` lets the service refuse a manager silently editing their own
// role through this generic endpoint, which could otherwise lock the account
// out of waiter management or leave the system with zero managers.
export async function updateWaiter(id: string, input: UpdateWaiterInput, actingUserId: string) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw ApiError.notFound("User not found.");
  }

  if (input.role && input.role !== target.role && id === actingUserId) {
    throw ApiError.forbidden("You cannot change your own role.");
  }

  if (input.email) {
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing && existing.id !== id) {
      throw ApiError.conflict("A user with this email already exists.");
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email?.toLowerCase(),
      role: input.role,
    },
  });

  return serializeUser(updated);
}
