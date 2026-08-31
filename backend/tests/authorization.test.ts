import { describe, it, expect } from "vitest";
import request from "supertest";
import { Role } from "../src/constants/roles";
import { createApp } from "../src/app";
import { createTestUser, DEFAULT_PASSWORD } from "./helpers";

const app = createApp();

async function loginAs(role: Role) {
  const user = await createTestUser({ role });
  const res = await request(app).post("/api/auth/login").send({ email: user.email, password: DEFAULT_PASSWORD });
  return { user, token: res.body.data.token as string };
}

describe("Role-based access to /api/waiters", () => {
  it("allows Manager to list waiters", async () => {
    const { token } = await loginAs(Role.MANAGER);
    const res = await request(app).get("/api/waiters").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.users)).toBe(true);
  });

  it("forbids Waiter from listing waiters", async () => {
    const { token } = await loginAs(Role.WAITER);
    const res = await request(app).get("/api/waiters").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("forbids Waiter from creating a waiter account", async () => {
    const { token } = await loginAs(Role.WAITER);
    const res = await request(app)
      .post("/api/waiters")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Person", email: "new-person@example.com", password: "Password123!" });
    expect(res.status).toBe(403);
  });

  it("forbids Waiter from updating a waiter account", async () => {
    const { token } = await loginAs(Role.WAITER);
    const other = await createTestUser({ role: Role.WAITER });
    const res = await request(app)
      .patch(`/api/waiters/${other.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Renamed" });
    expect(res.status).toBe(403);
  });

  it("rejects requests with no token at all", async () => {
    const res = await request(app).get("/api/waiters");
    expect(res.status).toBe(401);
  });

  it("rejects requests with an expired/invalid token", async () => {
    const res = await request(app).get("/api/waiters").set("Authorization", "Bearer garbage.token.value");
    expect(res.status).toBe(401);
  });
});

describe("Manager waiter management happy paths", () => {
  it("Manager can create a Waiter account", async () => {
    const { token } = await loginAs(Role.MANAGER);
    const res = await request(app)
      .post("/api/waiters")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Waiter", email: "new-waiter@example.com", password: "Password123!" });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("WAITER");
  });

  it("Manager can update a waiter's details", async () => {
    const { token } = await loginAs(Role.MANAGER);
    const waiter = await createTestUser({ role: Role.WAITER });
    const res = await request(app)
      .patch(`/api/waiters/${waiter.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Name" });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe("Updated Name");
  });
});

describe("Deactivation is not an exposed feature", () => {
  it("PATCH /api/waiters/:id/status no longer exists, even for a Manager", async () => {
    const { token } = await loginAs(Role.MANAGER);
    const waiter = await createTestUser({ role: Role.WAITER });
    const res = await request(app)
      .patch(`/api/waiters/${waiter.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "INACTIVE" });
    expect(res.status).toBe(404);
  });
});
