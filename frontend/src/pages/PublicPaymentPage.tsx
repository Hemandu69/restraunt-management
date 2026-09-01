import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { approvePublicPayment, getPublicPayment } from "../api/payments";
import { getApiErrorMessage } from "../api/client";
import { getSocket } from "../lib/socket";
import { formatInr } from "../lib/money";
import type { PublicPayment } from "../types/payment";

type LoadState = "loading" | "ready" | "not-found";

// The customer-facing page reached by scanning the waiter's QR code (spec
// section 7). No login, no navbar, no app shell - see App.tsx, where this
// route is mounted as a sibling of the authenticated app, not inside it.
// Only ever shows what this specific payment token is entitled to see:
// table number, order reference, amount, and status - nothing about staff,
// other orders, or the rest of the restaurant's operations.
export function PublicPaymentPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<LoadState>("loading");
  const [payment, setPayment] = useState<PublicPayment | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getPublicPayment(token);
        if (cancelled) return;
        setPayment(data);
        setState("ready");
      } catch {
        if (cancelled) return;
        setState("not-found");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Live updates only matter here if the *waiter* changes the payment's
  // state out from under a customer who's still looking at this page (e.g.
  // cancels it before they approve) - the customer's own approval is
  // already reflected by the direct API response below, no socket needed
  // for that.
  useEffect(() => {
    if (!token || state !== "ready") return;
    const socket = getSocket();

    function handleCancelled() {
      setPayment((prev) => (prev ? { ...prev, status: "CANCELLED" } : prev));
    }
    function handleExpired() {
      setPayment((prev) => (prev ? { ...prev, status: "EXPIRED" } : prev));
    }
    function subscribe() {
      socket.emit("payment:subscribe", { token });
    }

    socket.on("connect", subscribe);
    socket.on("payment:cancelled", handleCancelled);
    socket.on("payment:expired", handleExpired);
    if (socket.connected) subscribe();

    return () => {
      socket.off("connect", subscribe);
      socket.off("payment:cancelled", handleCancelled);
      socket.off("payment:expired", handleExpired);
    };
  }, [token, state]);

  async function handleApprove() {
    if (!token) return;
    setIsApproving(true);
    setApproveError("");
    try {
      const updated = await approvePublicPayment(token);
      setPayment(updated);
    } catch (err) {
      setApproveError(getApiErrorMessage(err, "Could not approve this payment. Please try again."));
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="pay-page">
      <div className="pay-card">
        <p className="pay-brand">Restaurant Management</p>

        {state === "loading" && <p className="muted">Loading payment…</p>}

        {state === "not-found" && (
          <>
            <p className="pay-status-title">Payment not found</p>
            <p className="muted">This payment link is invalid or no longer available.</p>
          </>
        )}

        {state === "ready" && payment && (
          <>
            <p className="pay-table">Table {payment.tableNumber}</p>

            {payment.status === "PENDING" && (
              <>
                <p className="pay-amount-label">Amount to pay</p>
                <p className="pay-amount">{formatInr(payment.amount)}</p>
                {approveError && (
                  <p className="pay-error" role="alert">
                    {approveError}
                  </p>
                )}
                <button type="button" className="btn btn-primary pay-approve-btn" onClick={handleApprove} disabled={isApproving}>
                  {isApproving ? "Approving…" : "Approve Payment"}
                </button>
              </>
            )}

            {payment.status === "PAID" && (
              <div className="pay-result success">
                <span className="pay-result-icon" aria-hidden="true">
                  ✓
                </span>
                <p className="pay-status-title">Payment Successful</p>
                <p className="pay-amount">{formatInr(payment.amount)}</p>
                <p className="muted">You may close this page.</p>
              </div>
            )}

            {payment.status === "EXPIRED" && (
              <div className="pay-result">
                <p className="pay-status-title">This payment has expired</p>
                <p className="muted">Please ask your server for a new QR code.</p>
              </div>
            )}

            {payment.status === "CANCELLED" && (
              <div className="pay-result">
                <p className="pay-status-title">This payment was cancelled</p>
                <p className="muted">Please ask your server if you still need to pay.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
