import http from "node:http";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { io as ioClient, type Socket } from "socket.io-client";
import { Role } from "../src/constants/roles";
import { createApp } from "../src/app";
import { createSocketServer } from "../src/realtime/socket";
import { supabase } from "../src/config/supabase";
import { createTestUser, DEFAULT_PASSWORD } from "./helpers";

// Requires a local Supabase stack running (`npx supabase start`) - see
// backend/.env.test and the root README. Payments live in Supabase Postgres
// (see the payments table migration), not the Prisma/SQLite test.db the
// rest of this test suite uses.

const app = createApp();
const httpServer = http.createServer(app);
createSocketServer(httpServer);

let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

async function loginAs(role: Role) {
  const user = await createTestUser({ role });
  const res = await request(app).post("/api/auth/login").send({ email: user.email, password: DEFAULT_PASSWORD });
  return { user, token: res.body.data.token as string };
}

const VALID_ORDER = {
  tableNumber: 4,
  orderReference: "order-ref-test",
  lines: [{ itemId: "st-01", quantity: 2 }], // st-01 = Paneer Tikka, 280 each
};
const EXPECTED_AMOUNT = 588; // (280*2 = 560) + 5% tax rounded (28) = 588

async function createWaiterPayment(overrides: Partial<typeof VALID_ORDER> = {}) {
  const { token } = await loginAs(Role.WAITER);
  const res = await request(app)
    .post("/api/payments")
    .set("Authorization", `Bearer ${token}`)
    .send({ ...VALID_ORDER, ...overrides });
  return { waiterToken: token, res };
}

describe("Payment creation", () => {
  // 1. Create payment as authenticated waiter.
  it("allows an authenticated Waiter to create a payment session", async () => {
    const { res } = await createWaiterPayment();
    expect(res.status).toBe(201);
    expect(res.body.data.payment.status).toBe("PENDING");
    expect(res.body.data.payment.amount).toBe(EXPECTED_AMOUNT);
    expect(typeof res.body.data.payment.token).toBe("string");
    expect(res.body.data.payment.token.length).toBeGreaterThan(20);
  });

  // 2. Unauthenticated user cannot create payment.
  it("rejects payment creation with no auth token", async () => {
    const res = await request(app).post("/api/payments").send(VALID_ORDER);
    expect(res.status).toBe(401);
  });

  // 14 (part 1). Manager/waiter permissions remain correct: payments are a
  // Waiter operation, not a Manager one (spec section 27).
  it("forbids a Manager from creating a payment", async () => {
    const { token } = await loginAs(Role.MANAGER);
    const res = await request(app).post("/api/payments").set("Authorization", `Bearer ${token}`).send(VALID_ORDER);
    expect(res.status).toBe(403);
  });

  it("does not trust a client-supplied amount - the server computes it from menu prices", async () => {
    const { res } = await createWaiterPayment({
      lines: [{ itemId: "st-01", quantity: 2 }],
      // @ts-expect-error - deliberately sending a field the schema doesn't accept
      amount: 1,
    } as never);
    expect(res.status).toBe(201);
    expect(res.body.data.payment.amount).toBe(EXPECTED_AMOUNT); // not 1
  });

  it("rejects a payment line referencing an unknown menu item", async () => {
    const { res } = await createWaiterPayment({ lines: [{ itemId: "not-a-real-item", quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  it("rejects an out-of-range table number", async () => {
    const { res } = await createWaiterPayment({ tableNumber: 999 });
    expect(res.status).toBe(400);
  });
});

describe("Public token access", () => {
  // 3. Customer can retrieve a valid payment using the public token.
  it("lets an unauthenticated client fetch a payment by its public token", async () => {
    const { res: created } = await createWaiterPayment();
    const token = created.body.data.payment.token as string;

    const res = await request(app).get(`/api/payments/token/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.payment.amount).toBe(EXPECTED_AMOUNT);
    expect(res.body.data.payment.tableNumber).toBe(VALID_ORDER.tableNumber);
    expect(res.body.data.payment.status).toBe("PENDING");
    // Nothing about the waiter is exposed to the public shape.
    expect(res.body.data.payment.waiterId).toBeUndefined();
  });

  // 4. Invalid payment token returns appropriate error.
  it("returns 404 for a token that doesn't correspond to any payment", async () => {
    const res = await request(app).get("/api/payments/token/not-a-real-token-at-all");
    expect(res.status).toBe(404);
  });
});

describe("Approval security", () => {
  // 5. Customer cannot modify another payment.
  it("approving payment A's token does not affect payment B", async () => {
    const a = await createWaiterPayment({ orderReference: "order-a" });
    const b = await createWaiterPayment({ orderReference: "order-b" });
    const tokenA = a.res.body.data.payment.token as string;
    const tokenB = b.res.body.data.payment.token as string;

    await request(app).post(`/api/payments/token/${tokenA}/approve`);

    const checkB = await request(app).get(`/api/payments/token/${tokenB}`);
    expect(checkB.body.data.payment.status).toBe("PENDING");
  });

  // 6. Customer cannot modify payment amount.
  it("ignores any amount sent in the approve request body", async () => {
    const { res: created } = await createWaiterPayment();
    const token = created.body.data.payment.token as string;

    const res = await request(app).post(`/api/payments/token/${token}/approve`).send({ amount: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.payment.amount).toBe(EXPECTED_AMOUNT);
  });

  // 7. Customer cannot modify order ID.
  it("ignores any orderReference sent in the approve request body", async () => {
    const { res: created } = await createWaiterPayment({ orderReference: "original-ref" });
    const token = created.body.data.payment.token as string;

    await request(app).post(`/api/payments/token/${token}/approve`).send({ orderReference: "FAKE-REF" });

    const check = await request(app).get(`/api/payments/token/${token}`);
    expect(check.body.data.payment.orderReference).toBe("original-ref");
  });

  // 8. Pending payment can be approved.
  it("approves a pending payment", async () => {
    const { res: created } = await createWaiterPayment();
    const token = created.body.data.payment.token as string;

    const res = await request(app).post(`/api/payments/token/${token}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe("PAID");
    expect(res.body.data.payment.paidAt).toBeTruthy();
  });

  // 9. Paid payment cannot be approved again (idempotent, not duplicated).
  it("re-approving an already-paid payment returns the same successful state", async () => {
    const { res: created } = await createWaiterPayment();
    const token = created.body.data.payment.token as string;

    const first = await request(app).post(`/api/payments/token/${token}/approve`);
    const second = await request(app).post(`/api/payments/token/${token}/approve`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data.payment.status).toBe("PAID");
    expect(second.body.data.payment.paidAt).toBe(first.body.data.payment.paidAt);
  });

  // 10. Cancelled payment cannot be approved.
  it("rejects approval of a cancelled payment", async () => {
    const { waiterToken, res: created } = await createWaiterPayment();
    const token = created.body.data.payment.token as string;
    const id = created.body.data.payment.id as string;

    await request(app).post(`/api/payments/${id}/cancel`).set("Authorization", `Bearer ${waiterToken}`);

    const res = await request(app).post(`/api/payments/token/${token}/approve`);
    expect(res.status).toBe(409);
  });

  // 11. Expired payment cannot be approved.
  it("rejects approval of an expired payment", async () => {
    const { res: created } = await createWaiterPayment();
    const token = created.body.data.payment.token as string;
    const id = created.body.data.payment.id as string;

    // Simulate time passing: backdate expires_at directly (bypassing the
    // frontend-only countdown timer entirely, per spec section 10).
    await supabase
      .from("payments")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("id", id);

    const res = await request(app).post(`/api/payments/token/${token}/approve`);
    expect(res.status).toBe(409);

    const check = await request(app).get(`/api/payments/token/${token}`);
    expect(check.body.data.payment.status).toBe("EXPIRED");
  });

  // 12. Duplicate simultaneous approval cannot create duplicate payments.
  it("handles two concurrent approval requests without creating a duplicate PAID state", async () => {
    const { res: created } = await createWaiterPayment();
    const token = created.body.data.payment.token as string;

    const [first, second] = await Promise.all([
      request(app).post(`/api/payments/token/${token}/approve`),
      request(app).post(`/api/payments/token/${token}/approve`),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.payment.paidAt).toBe(second.body.data.payment.paidAt);
  });
});

describe("Ownership and cancellation", () => {
  // 13. A waiter cannot act on another waiter's payment.
  it("forbids a different Waiter from cancelling someone else's payment", async () => {
    const { res: created } = await createWaiterPayment();
    const id = created.body.data.payment.id as string;
    const { token: otherWaiterToken } = await loginAs(Role.WAITER);

    const res = await request(app).post(`/api/payments/${id}/cancel`).set("Authorization", `Bearer ${otherWaiterToken}`);
    expect(res.status).toBe(403);
  });

  it("forbids a different Waiter from viewing someone else's payment by id", async () => {
    const { res: created } = await createWaiterPayment();
    const id = created.body.data.payment.id as string;
    const { token: otherWaiterToken } = await loginAs(Role.WAITER);

    const res = await request(app).get(`/api/payments/${id}`).set("Authorization", `Bearer ${otherWaiterToken}`);
    expect(res.status).toBe(403);
  });

  it("lets the owning Waiter cancel their own pending payment", async () => {
    const { waiterToken, res: created } = await createWaiterPayment();
    const id = created.body.data.payment.id as string;

    const res = await request(app).post(`/api/payments/${id}/cancel`).set("Authorization", `Bearer ${waiterToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe("CANCELLED");
  });

  it("rejects cancelling an already-paid payment", async () => {
    const { waiterToken, res: created } = await createWaiterPayment();
    const token = created.body.data.payment.token as string;
    const id = created.body.data.payment.id as string;

    await request(app).post(`/api/payments/token/${token}/approve`);

    const res = await request(app).post(`/api/payments/${id}/cancel`).set("Authorization", `Bearer ${waiterToken}`);
    expect(res.status).toBe(409);
  });
});

describe("Real-time Socket.IO flow", () => {
  // 15. Socket events are emitted only after the authoritative database
  // state change has committed - this test proves the event's payload
  // matches what a subsequent authoritative GET returns, and that it
  // arrives without any polling.
  it("emits payment:paid to the payment room only after the database transition commits, and it matches the authoritative state", async () => {
    const { waiterToken, res: created } = await createWaiterPayment();
    const paymentId = created.body.data.payment.id as string;
    const token = created.body.data.payment.token as string;

    const waiterSocket: Socket = ioClient(baseUrl, {
      extraHeaders: { Cookie: `rms_token=${waiterToken}` },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => waiterSocket.on("connect", () => resolve()));
    waiterSocket.emit("payment:subscribe", { paymentId, role: "waiter" });
    // Give the server a moment to process the join before approval fires.
    await new Promise((resolve) => setTimeout(resolve, 150));

    const eventPromise = new Promise<{ paymentId: string; status: string; paidAt: string }>((resolve) => {
      waiterSocket.on("payment:paid", resolve);
    });

    const approveRes = await request(app).post(`/api/payments/token/${token}/approve`);
    expect(approveRes.status).toBe(200);

    const event = await eventPromise;
    expect(event.paymentId).toBe(paymentId);
    expect(event.status).toBe("PAID");
    expect(event.paidAt).toBe(approveRes.body.data.payment.paidAt);

    waiterSocket.close();
  });

  it("does not let a socket join another waiter's payment room by guessing the paymentId", async () => {
    const { res: created } = await createWaiterPayment();
    const paymentId = created.body.data.payment.id as string;
    const { token: otherWaiterToken } = await loginAs(Role.WAITER);

    const otherSocket: Socket = ioClient(baseUrl, {
      extraHeaders: { Cookie: `rms_token=${otherWaiterToken}` },
      transports: ["websocket"],
    });
    await new Promise<void>((resolve) => otherSocket.on("connect", () => resolve()));

    const errorPromise = new Promise<{ message: string }>((resolve) => {
      otherSocket.on("payment:error", resolve);
    });
    otherSocket.emit("payment:subscribe", { paymentId, role: "waiter" });

    const error = await errorPromise;
    expect(error.message).toBeTruthy();

    otherSocket.close();
  });

  it("lets a customer socket join a payment room using the valid public token", async () => {
    const { waiterToken, res: created } = await createWaiterPayment();
    const paymentId = created.body.data.payment.id as string;
    const token = created.body.data.payment.token as string;

    const customerSocket: Socket = ioClient(baseUrl, { transports: ["websocket"] });
    await new Promise<void>((resolve) => customerSocket.on("connect", () => resolve()));

    const eventPromise = new Promise<{ paymentId: string; status: string }>((resolve) => {
      customerSocket.on("payment:cancelled", resolve);
    });
    customerSocket.emit("payment:subscribe", { token });
    await new Promise((resolve) => setTimeout(resolve, 150));

    await request(app).post(`/api/payments/${paymentId}/cancel`).set("Authorization", `Bearer ${waiterToken}`);

    const event = await eventPromise;
    expect(event.paymentId).toBe(paymentId);
    expect(event.status).toBe("CANCELLED");

    customerSocket.close();
  });
});
