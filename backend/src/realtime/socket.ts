import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env";
import { verifyAuthToken } from "../auth/jwt";
import { supabase } from "../config/supabase";
import { hashPaymentToken } from "../lib/paymentToken";

// Lazily set by createSocketServer() (called only from server.ts, once, at
// process startup). Left undefined in tests, which exercise the Express app
// via supertest without booting a real HTTP/socket server - emitPaymentStatus
// below no-ops in that case rather than throwing, so payment.service.ts
// doesn't need to know whether sockets are running.
let io: Server | undefined;

function paymentRoom(paymentId: string): string {
  return `payment:${paymentId}`;
}

function extractCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

// Resolves the authenticated waiter/manager for this socket connection, the
// same way the HTTP `authenticate` middleware does (same cookie, same JWT
// verification) - but does not reject the connection if absent, since the
// public customer payment page connects with no session at all. Identity is
// only required at the point a client tries to subscribe to a payment as a
// waiter (see the "payment:subscribe" handler below).
function resolveSocketUser(socket: Socket): { id: string } | undefined {
  const token = extractCookie(socket.handshake.headers.cookie, env.authCookieName);
  if (!token) return undefined;
  try {
    const payload = verifyAuthToken(token);
    return { id: payload.sub };
  } catch {
    return undefined;
  }
}

type SubscribePayload = { paymentId: string; role: "waiter" } | { token: string };

// Server-side authorization for room membership - this is the control that
// makes payment:subscribe safe (see spec section 14, "Socket Authorization"):
// a client can never join an arbitrary payment's room just by naming its id.
//
//   - A waiter subscribes by paymentId, but only after this handler confirms
//     (from the authenticated cookie session, not from anything the client
//     asserts) that they are the payment's own creator.
//   - The public customer page subscribes by its payment token - the same
//     secure token from the QR/URL - which is hashed and looked up the same
//     way the REST endpoints do. There is no path for a client to join a
//     room by paymentId alone without already holding that payment's token
//     or being its owning waiter.
async function handleSubscribe(socket: Socket, payload: SubscribePayload) {
  if ("token" in payload) {
    const tokenHash = hashPaymentToken(payload.token);
    const { data } = await supabase.from("payments").select("id").eq("token_hash", tokenHash).maybeSingle();
    if (!data) {
      socket.emit("payment:error", { message: "Invalid payment token." });
      return;
    }
    socket.join(paymentRoom(data.id as string));
    return;
  }

  const user = resolveSocketUser(socket);
  if (!user) {
    socket.emit("payment:error", { message: "Authentication required." });
    return;
  }
  const { data } = await supabase.from("payments").select("id, waiter_id").eq("id", payload.paymentId).maybeSingle();
  if (!data || data.waiter_id !== user.id) {
    socket.emit("payment:error", { message: "You cannot subscribe to this payment." });
    return;
  }
  socket.join(paymentRoom(data.id as string));
}

export function createSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.on("payment:subscribe", (payload: SubscribePayload) => {
      handleSubscribe(socket, payload).catch(() => {
        socket.emit("payment:error", { message: "Could not subscribe to payment updates." });
      });
    });
  });

  return io;
}

export interface PaymentStatusEvent {
  status: "PAID" | "EXPIRED" | "CANCELLED";
  amount: number;
  paidAt: string | null;
}

const EVENT_NAME_BY_STATUS: Record<PaymentStatusEvent["status"], string> = {
  PAID: "payment:paid",
  EXPIRED: "payment:expired",
  CANCELLED: "payment:cancelled",
};

// Only the fields both a waiter and the specific customer who holds this
// payment's own token are already entitled to see - no staff/internal data.
export function emitPaymentStatus(paymentId: string, event: PaymentStatusEvent): void {
  if (!io) return; // no socket server running (e.g. under test)
  const room = paymentRoom(paymentId);
  const body = { paymentId, ...event };
  io.to(room).emit(EVENT_NAME_BY_STATUS[event.status], body);
  io.to(room).emit("payment:status", body);
}
