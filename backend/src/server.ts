import http from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { createSocketServer } from "./realtime/socket";

const app = createApp();

// One HTTP server carries both the Express API and Socket.IO - not two
// separate servers/ports (spec section 33). createApp() stays a plain
// Express app with no socket wiring so backend tests (supertest, which
// calls createApp() directly) don't need a real HTTP/socket server at all.
const httpServer = http.createServer(app);
createSocketServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Restaurant Management API listening on port ${env.port} (${env.nodeEnv})`);
});

// Graceful shutdown: stop accepting new connections (HTTP and socket) and
// let in-flight requests finish before the process exits.
function shutdown() {
  httpServer.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
