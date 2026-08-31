import { describe, it, expect } from "vitest";
import request from "supertest";
import { Role, UserStatus } from "../src/constants/roles";
import { createApp } from "../src/app";
import { createTestUser, DEFAULT_PASSWORD } from "./helpers";

const app = createApp();

describe("POST /api/auth/login", () => {
  it("logs in with valid credentials and returns the auth mechanism", async () => {
    const user = await createTestUser({ role: Role.MANAGER });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: DEFAULT_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.authMechanism).toBe("JWT");
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects an invalid password", async () => {
    const user = await createTestUser({ role: Role.WAITER });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "WrongPassword1!" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a nonexistent user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "Password123!" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a login for an inactive user", async () => {
    const user = await createTestUser({ role: Role.WAITER, status: UserStatus.INACTIVE });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: DEFAULT_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects malformed request bodies", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });
});

describe("GET /api/auth/me", () => {
  it("returns the authenticated user's safe profile", async () => {
    const user = await createTestUser({ role: Role.MANAGER });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: DEFAULT_PASSWORD });
    const token = login.body.data.token;

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "MANAGER",
    });
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects an invalid/garbage token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the auth cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    const setCookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(setCookie).toMatch(/rms_token=;/);
  });
});
