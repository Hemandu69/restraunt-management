import { Role, UserStatus } from "../constants/roles";
import { prisma } from "../config/database";
import { verifyPassword } from "../auth/password";
import { signAuthToken } from "../auth/jwt";
import { ApiError } from "../utils/ApiError";
import { serializeUser } from "../utils/serializeUser";

export async function loginWithEmailAndPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Same generic message whether the account is missing or the password is
  // wrong, so the endpoint can't be used to enumerate registered emails.
  if (!user) {
    throw ApiError.unauthenticated("Invalid email or password.");
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw ApiError.unauthenticated("Invalid email or password.");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw ApiError.unauthenticated("This account has been deactivated. Contact a manager.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signAuthToken({ sub: updatedUser.id, role: updatedUser.role as Role });

  return { token, user: serializeUser(updatedUser) };
}
