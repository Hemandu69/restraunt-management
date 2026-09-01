import crypto from "node:crypto";

// The raw token is what goes into the QR / /pay/:token URL - it is the
// customer device's only credential. Only its SHA-256 hash is ever stored
// (see the payments table migration), so a database leak alone can't be
// replayed as a working payment link.
export function generatePaymentToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashPaymentToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
