import { io, type Socket } from "socket.io-client";

// The Socket.IO server is attached to the same backend HTTP server the REST
// API runs on (see backend/src/server.ts) - derive its origin from the same
// VITE_API_URL used by api/client.ts rather than adding a second env var
// (spec section 34: don't add unnecessary environment variables).
const SOCKET_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api").replace(/\/api\/?$/, "");

let socket: Socket | undefined;

// A single shared connection for the whole app, created lazily on first
// use. withCredentials so the waiter's httpOnly auth cookie reaches the
// server's handshake (see realtime/socket.ts's resolveSocketUser) - the
// public /pay/:token page uses the same client but never has that cookie,
// which is fine: it only ever subscribes by payment token, not by identity.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { withCredentials: true, autoConnect: true });
  }
  return socket;
}
