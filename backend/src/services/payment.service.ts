import { supabase } from "../config/supabase";
import { env } from "../config/env";
import { MENU_PRICES } from "../data/menuPrices";
import { calculateTotals } from "../lib/money";
import { generatePaymentToken, hashPaymentToken } from "../lib/paymentToken";
import { ApiError } from "../utils/ApiError";
import { emitPaymentStatus } from "../realtime/socket";
import type { CreatePaymentInput } from "../validation/payment.schemas";

export type PaymentStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

interface PaymentRow {
  id: string;
  table_number: number;
  order_reference: string;
  waiter_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  token_hash: string;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
}

// Fields safe to hand back over the wire. token_hash never leaves the
// service layer; waiter_id is included for the waiter-facing shape but
// stripped for the public one (see toPublicPayment).
function toWaiterPayment(row: PaymentRow) {
  return {
    id: row.id,
    tableNumber: row.table_number,
    orderReference: row.order_reference,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    cancelledAt: row.cancelled_at,
  };
}

// Section 6/7 of the payment spec: the customer sees table, order
// reference, amount, and status - nothing about the waiter, and no
// database ids beyond what's needed to display the page.
function toPublicPayment(row: PaymentRow) {
  return {
    tableNumber: row.table_number,
    orderReference: row.order_reference,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    paidAt: row.paid_at,
  };
}

// Schedules a proactive flip to EXPIRED at the exact expiry instant, so the
// waiter's UI updates in real time instead of only on the next read/approve
// (see expireIfPastDue below, which is the actual enforcement and remains
// correct on its own - this timer is a promptness improvement on top of it,
// not a replacement for it. If the process restarts before it fires, the
// lazy check still catches the expiry on the next read/approve; nothing
// about correctness depends on this timer running.)
const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearExpiryTimer(paymentId: string): void {
  const timer = expiryTimers.get(paymentId);
  if (timer) {
    clearTimeout(timer);
    expiryTimers.delete(paymentId);
  }
}

function scheduleExpiry(paymentId: string, tokenHash: string, delayMs: number): void {
  const timer = setTimeout(() => {
    expiryTimers.delete(paymentId);
    void supabase
      .from("payments")
      .update({ status: "EXPIRED" })
      .eq("token_hash", tokenHash)
      .eq("status", "PENDING")
      .select()
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const row = data as PaymentRow;
          emitPaymentStatus(row.id, { status: "EXPIRED", amount: row.amount, paidAt: null });
        }
      });
  }, delayMs);
  // Don't let this timer alone keep the Node process alive (relevant for
  // graceful shutdown - see server.ts).
  timer.unref?.();
  expiryTimers.set(paymentId, timer);
}

// The backend's own price list is the only source of truth for `amount` -
// item ids/quantities come from the client, but their prices never do. An
// unknown item id fails closed (BAD_REQUEST) rather than being silently
// skipped or priced at 0.
function computeAmount(lines: CreatePaymentInput["lines"]): number {
  const billLines = lines.map(({ itemId, quantity }) => {
    const price = MENU_PRICES[itemId];
    if (price === undefined) {
      throw ApiError.badRequest(`Unknown menu item: ${itemId}`);
    }
    return { price, quantity };
  });
  return calculateTotals(billLines).total;
}

export async function createPayment(waiterId: string, input: CreatePaymentInput) {
  const amount = computeAmount(input.lines);
  const token = generatePaymentToken();
  const tokenHash = hashPaymentToken(token);
  const expiresAt = new Date(Date.now() + env.paymentExpiryMinutes * 60_000).toISOString();

  const { data, error } = await supabase
    .from("payments")
    .insert({
      table_number: input.tableNumber,
      order_reference: input.orderReference,
      waiter_id: waiterId,
      amount,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !data) {
    throw new ApiError("INTERNAL_ERROR", "Could not create the payment session.");
  }

  const row = data as PaymentRow;
  scheduleExpiry(row.id, row.token_hash, env.paymentExpiryMinutes * 60_000);
  // The raw token is returned exactly once, here - it is what the QR code
  // and /pay/:token link are built from. It is never stored or logged.
  return { ...toWaiterPayment(row), token };
}

// Flips any PENDING-but-past-expiry row to EXPIRED before it's read. This
// is lazy (evaluated on read/approve), not a background job - there is no
// separate expiry sweep process, matching "the backend must enforce
// expiration" without adding new infrastructure.
async function expireIfPastDue(tokenHash: string): Promise<void> {
  await supabase
    .from("payments")
    .update({ status: "EXPIRED" })
    .eq("token_hash", tokenHash)
    .eq("status", "PENDING")
    .lt("expires_at", new Date().toISOString());
}

async function fetchByTokenHash(tokenHash: string): Promise<PaymentRow> {
  const { data, error } = await supabase.from("payments").select().eq("token_hash", tokenHash).maybeSingle();
  if (error || !data) {
    throw ApiError.notFound("Payment not found.");
  }
  return data as PaymentRow;
}

export async function getPaymentByToken(token: string) {
  const tokenHash = hashPaymentToken(token);
  await expireIfPastDue(tokenHash);
  const row = await fetchByTokenHash(tokenHash);
  return toPublicPayment(row);
}

export async function getPaymentById(id: string, waiterId: string) {
  const { data, error } = await supabase.from("payments").select().eq("id", id).maybeSingle();
  if (error || !data) {
    throw ApiError.notFound("Payment not found.");
  }
  const row = data as PaymentRow;
  if (row.waiter_id !== waiterId) {
    throw ApiError.forbidden("You can only view your own payment sessions.");
  }
  return toWaiterPayment(row);
}

// Idempotent approval (spec section 9). The UPDATE's WHERE clause
// (status = 'PENDING' AND expires_at > now) is the entire concurrency
// story: Postgres row-level locking guarantees that of two simultaneous
// approval requests for the same row, only one UPDATE statement actually
// matches and commits a PENDING -> PAID transition - the second blocks on
// the row lock, then re-evaluates its WHERE clause against the
// already-committed new status and matches zero rows. No advisory lock or
// application-level mutex is needed. The database transition trigger
// (enforce_payment_transitions.sql) is a second, independent layer that
// would reject an invalid transition even if this WHERE clause were ever
// wrong.
export async function approvePaymentByToken(token: string) {
  const tokenHash = hashPaymentToken(token);
  await expireIfPastDue(tokenHash);

  const paidAt = new Date().toISOString();
  const { data: updated } = await supabase
    .from("payments")
    .update({ status: "PAID", paid_at: paidAt })
    .eq("token_hash", tokenHash)
    .eq("status", "PENDING")
    .select()
    .maybeSingle();

  if (updated) {
    const row = updated as PaymentRow;
    clearExpiryTimer(row.id);
    emitPaymentStatus(row.id, { status: "PAID", amount: row.amount, paidAt: row.paid_at });
    return toPublicPayment(row);
  }

  // The conditional update matched nothing - find out why and return an
  // appropriately specific result rather than a generic failure.
  const row = await fetchByTokenHash(tokenHash);
  if (row.status === "PAID") {
    // Already approved (by this request racing another, or a genuine
    // repeat request) - return the current successful state instead of
    // erroring, per spec section 9.
    return toPublicPayment(row);
  }
  if (row.status === "EXPIRED") {
    throw ApiError.conflict("This payment session has expired.");
  }
  throw ApiError.conflict("This payment session has been cancelled.");
}

export async function cancelPayment(paymentId: string, waiterId: string) {
  const { data: existing, error } = await supabase.from("payments").select().eq("id", paymentId).maybeSingle();
  if (error || !existing) {
    throw ApiError.notFound("Payment not found.");
  }
  const existingRow = existing as PaymentRow;
  if (existingRow.waiter_id !== waiterId) {
    throw ApiError.forbidden("You can only cancel your own payment sessions.");
  }

  const cancelledAt = new Date().toISOString();
  const { data: updated } = await supabase
    .from("payments")
    .update({ status: "CANCELLED", cancelled_at: cancelledAt })
    .eq("id", paymentId)
    .eq("status", "PENDING")
    .select()
    .maybeSingle();

  if (updated) {
    const row = updated as PaymentRow;
    clearExpiryTimer(row.id);
    emitPaymentStatus(row.id, { status: "CANCELLED", amount: row.amount, paidAt: null });
    return toWaiterPayment(row);
  }

  if (existingRow.status === "CANCELLED") {
    return toWaiterPayment(existingRow);
  }
  if (existingRow.status === "PAID") {
    throw ApiError.conflict("A paid payment cannot be cancelled.");
  }
  throw ApiError.conflict("This payment session has already expired.");
}
