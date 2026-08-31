import "dotenv/config";
import { Role, UserStatus } from "../constants/roles";
import { prisma } from "../config/database";
import { hashPassword } from "../auth/password";

// Controlled provisioning for the very first Manager account. Intended to be
// run once, locally or via a deployment shell, as:
//   npm run seed:manager
// It is NOT an HTTP endpoint and is never reachable over the network.
async function main() {
  const name = process.env.INITIAL_MANAGER_NAME;
  const email = process.env.INITIAL_MANAGER_EMAIL?.toLowerCase();
  const password = process.env.INITIAL_MANAGER_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      "seed:manager requires INITIAL_MANAGER_NAME, INITIAL_MANAGER_EMAIL and INITIAL_MANAGER_PASSWORD to be set in the environment (.env)."
    );
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.error("INITIAL_MANAGER_PASSWORD must be at least 8 characters long.");
    process.exitCode = 1;
    return;
  }

  const existingManager = await prisma.user.findFirst({ where: { role: Role.MANAGER } });
  if (existingManager) {
    console.log(`A Manager account already exists (${existingManager.email}). Skipping seed to avoid duplicates.`);
    return;
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    console.error(`A user with email ${email} already exists but is not a Manager. Aborting.`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);
  const manager = await prisma.user.create({
    data: { name, email, passwordHash, role: Role.MANAGER, status: UserStatus.ACTIVE },
  });

  console.log(`Initial Manager account created: ${manager.email} (id: ${manager.id})`);
}

main()
  .catch((error) => {
    console.error("Failed to seed initial Manager:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
