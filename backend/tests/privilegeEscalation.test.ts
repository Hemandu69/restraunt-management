import { describe, it, expect } from "vitest";
import request from "supertest";
import { Role, UserStatus } from "../src/constants/roles";
import { createApp } from "../src/app";
import { prisma } from "../src/config/database";
import { createTestUser, DEFAULT_PASSWORD } from "./helpers";

const app = createApp();

async function loginAs(role: Role) {
  const user = await createTestUser({ role });
  const res = await request(app).post("/api/auth/login").send({ email: user.email, password: DEFAULT_PASSWORD });
  return { user, token: res.body.data.token as string };
}

describe("Privilege escalation protection", () => {
  it("Case 1: Waiter cannot create a waiter account via POST /api/waiters", async () => {
    const { token } = await loginAs(Role.WAITER);
    const res = await request(app)
      .post("/api/waiters")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Attacker", email: "attacker@example.com", password: "Password123!", role: "MANAGER" });
    expect(res.status).toBe(403);
  });

  it("cannot become MANAGER by sending role in the create-waiter payload", async () => {
    const { token } = await loginAs(Role.MANAGER);
    const res = await request(app)
      .post("/api/waiters")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Sneaky", email: "sneaky@example.com", password: "Password123!", role: "MANAGER" });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("WAITER");
  });

  it("Case 2: Waiter cannot promote themselves to MANAGER", async () => {
    const { user, token } = await loginAs(Role.WAITER);
    const res = await request(app)
      .patch(`/api/waiters/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "MANAGER" });
    // Blocked at the authorization layer before reaching the self-role-change check.
    expect(res.status).toBe(403);

    const check = await request(app).get(`/api/waiters/${user.id}`).set(
      "Authorization",
      `Bearer ${(await loginAs(Role.MANAGER)).token}`
    );
    expect(check.body.data.user.role).toBe("WAITER");
  });

  it("Case 3: Waiter cannot change another user's role", async () => {
    const { token } = await loginAs(Role.WAITER);
    const otherWaiter = await createTestUser({ role: Role.WAITER });
    const res = await request(app)
      .patch(`/api/waiters/${otherWaiter.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "MANAGER" });
    expect(res.status).toBe(403);
  });

  it("a Manager cannot change their own role through the update endpoint (lockout protection)", async () => {
    const { user, token } = await loginAs(Role.MANAGER);
    const res = await request(app)
      .patch(`/api/waiters/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "WAITER" });
    expect(res.status).toBe(403);
  });

  it("an inactive account's existing token is rejected on subsequent requests", async () => {
    const { user, token } = await loginAs(Role.WAITER);

    // There is no API route to deactivate an account (deactivation is not
    // an exposed application feature) - the `status` column still exists
    // for future account administration, so this simulates a future
    // out-of-band process flipping it directly.
    await prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.INACTIVE } });

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
