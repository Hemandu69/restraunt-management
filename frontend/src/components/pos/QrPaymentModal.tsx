import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "../Modal";
import { ConfirmDialog } from "../ConfirmDialog";
import { useToast } from "../../context/ToastContext";
import { getSocket } from "../../lib/socket";
import { createPayment, cancelPayment, getPaymentById } from "../../api/payments";
import { getApiErrorMessage } from "../../api/client";
import { formatInr } from "../../lib/money";
import type { CreatedPayment } from "../../types/payment";
import type { OrderLine } from "./OrderPanel";

interface QrPaymentModalProps {
  tableNumber: number;
  orderReference: string;
  lines: OrderLine[];
  onClose: () => void;
  /** Called once, when the payment reaches PAID - lets the caller reset the table's order. */
  onPaymentSuccess: () => void;
}

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Waiter-side "Pay by QR" flow (spec sections 4, 22-24, 28). Creates a
// payment session on open, displays its QR/status, and reflects PENDING ->
// PAID/EXPIRED/CANCELLED purely from server-confirmed state - Socket.IO for
// the customer's own approval (this waiter doesn't cause that transition),
// direct API responses for the waiter's own Cancel action. The countdown
// shown is cosmetic only (spec section 10); expiry is only ever treated as
// real once the server says so.
export function QrPaymentModal({ tableNumber, orderReference, lines, onClose, onPaymentSuccess }: QrPaymentModalProps) {
  const toast = useToast();
  const [phase, setPhase] = useState<"creating" | "error" | "active">("creating");
  const [errorMessage, setErrorMessage] = useState("");
  const [payment, setPayment] = useState<CreatedPayment | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const hasNotifiedSuccess = useRef(false);
  const paymentRequestRef = useRef<Promise<CreatedPayment> | null>(null);

  // Applies a server-confirmed status. Idempotent by design: a redundant
  // delivery of the same status (e.g. this waiter's own cancel response
  // *and* the socket broadcast of that same cancellation both arriving) is
  // a no-op past the first application, so nothing double-toasts.
  function applyStatus(status: CreatedPayment["status"], paidAt: string | null, sourceForToast: "socket" | null) {
    setPayment((prev) => {
      if (!prev || prev.status === status) return prev;
      if (sourceForToast === "socket") {
        if (status === "PAID") toast.success("Payment approved.");
        if (status === "EXPIRED") toast.warning("Payment session expired.");
        if (status === "CANCELLED") toast.info("Payment session cancelled.");
      }
      if (status === "PAID" && !hasNotifiedSuccess.current) {
        hasNotifiedSuccess.current = true;
        onPaymentSuccess();
      }
      return { ...prev, status, paidAt: paidAt ?? prev.paidAt };
    });
  }

  useEffect(() => {
    // React StrictMode intentionally mounts, cleans up, and re-mounts every
    // component once in development to catch effects that aren't safe to
    // run twice - exactly this one. The fix is NOT to skip the second
    // invocation outright (that was tried and regressed: the discarded
    // first invocation's `cancelled` flag then suppresses the only
    // setPayment/setPhase call that would ever have run, leaving the modal
    // stuck on "Creating payment session..." forever even though the
    // payment was in fact created - confirmed while manually testing this
    // feature). Instead, cache the in-flight *promise* itself: the request
    // fires exactly once (whichever invocation finds the ref empty starts
    // it), but every invocation - including the one StrictMode keeps -
    // still attaches its own `.then`/`.catch`, gated by its own `cancelled`
    // closure. Only the surviving mount's handler actually applies state.
    let cancelled = false;
    if (!paymentRequestRef.current) {
      paymentRequestRef.current = createPayment({
        tableNumber,
        orderReference,
        lines: lines.map((line) => ({ itemId: line.item.id, quantity: line.quantity })),
      });
    }
    paymentRequestRef.current
      .then((created) => {
        if (cancelled) return;
        setPayment(created);
        setPhase("active");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(getApiErrorMessage(err, "Unable to create the payment session."));
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created exactly once per modal open
  }, []);

  // Socket subscription + reconnect handling. Re-subscribes on every
  // (re)connect, since room membership is per-socket-connection and does
  // not survive a reconnect - and does a one-time authoritative refetch
  // after a reconnect rather than trusting whatever state was last known
  // client-side (spec section 28).
  useEffect(() => {
    if (!payment) return;
    const socket = getSocket();

    function subscribe() {
      socket.emit("payment:subscribe", { paymentId: payment!.id, role: "waiter" });
    }

    function handlePaid(event: { paymentId: string; status: "PAID"; paidAt: string }) {
      if (event.paymentId !== payment!.id) return;
      applyStatus("PAID", event.paidAt, "socket");
    }
    function handleExpired(event: { paymentId: string; status: "EXPIRED" }) {
      if (event.paymentId !== payment!.id) return;
      applyStatus("EXPIRED", null, "socket");
    }
    function handleCancelled(event: { paymentId: string; status: "CANCELLED" }) {
      if (event.paymentId !== payment!.id) return;
      applyStatus("CANCELLED", null, "socket");
    }
    async function handleConnect() {
      setIsConnected(true);
      subscribe();
      try {
        const authoritative = await getPaymentById(payment!.id);
        applyStatus(authoritative.status, authoritative.paidAt, null);
      } catch {
        // Non-fatal - the socket subscription above still keeps state fresh.
      }
    }
    function handleDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("payment:paid", handlePaid);
    socket.on("payment:expired", handleExpired);
    socket.on("payment:cancelled", handleCancelled);

    if (socket.connected) subscribe();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("payment:paid", handlePaid);
      socket.off("payment:expired", handleExpired);
      socket.off("payment:cancelled", handleCancelled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- payment.id is the only relevant identity
  }, [payment?.id]);

  useEffect(() => {
    if (payment?.status !== "PENDING") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [payment?.status]);

  async function handleCancel() {
    if (!payment) return;
    try {
      const updated = await cancelPayment(payment.id);
      applyStatus(updated.status, updated.paidAt, null);
      toast.info(`Payment cancelled for Table ${tableNumber}.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Unable to cancel the payment."));
    } finally {
      setIsCancelConfirmOpen(false);
    }
  }

  if (phase === "creating") {
    return (
      <Modal title="Pay by QR" description={`Table ${tableNumber}`} onClose={onClose}>
        <p className="muted">Creating payment session…</p>
      </Modal>
    );
  }

  if (phase === "error") {
    return (
      <Modal title="Pay by QR" description={`Table ${tableNumber}`} onClose={onClose}>
        <p style={{ color: "var(--color-danger)" }}>{errorMessage}</p>
        <div className="table-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    );
  }

  if (!payment) return null;

  const payUrl = `${window.location.origin}/pay/${payment.token}`;
  const msRemaining = new Date(payment.expiresAt).getTime() - now;

  return (
    <Modal title="Pay by QR" description={`Table ${tableNumber}`} onClose={onClose}>
      {!isConnected && (
        <p className="qr-connection-notice" role="status">
          Reconnecting… payment status will refresh automatically.
        </p>
      )}

      {payment.status === "PENDING" && (
        <div className="qr-payment-body">
          <p className="qr-payment-amount">{formatInr(payment.amount)}</p>
          <div className="qr-code-frame">
            <QRCodeSVG value={payUrl} size={200} />
          </div>
          <p className="muted">Waiting for payment… ({formatCountdown(msRemaining)})</p>
          <p className="muted qr-payment-hint">Open this QR on another device to approve the payment.</p>
          <div className="table-actions">
            <button type="button" className="btn btn-danger" onClick={() => setIsCancelConfirmOpen(true)}>
              Cancel Payment
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      )}

      {payment.status === "PAID" && (
        <div className="qr-payment-body qr-payment-result success">
          <span className="qr-payment-result-icon" aria-hidden="true">
            ✓
          </span>
          <p className="qr-payment-result-title">Payment Successful</p>
          <p className="qr-payment-amount">{formatInr(payment.amount)}</p>
          <div className="table-actions">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      )}

      {payment.status === "EXPIRED" && (
        <div className="qr-payment-body qr-payment-result">
          <p className="qr-payment-result-title">Payment session expired</p>
          <p className="muted">Start a new payment if the customer is still ready to pay.</p>
          <div className="table-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      )}

      {payment.status === "CANCELLED" && (
        <div className="qr-payment-body qr-payment-result">
          <p className="qr-payment-result-title">Payment cancelled</p>
          <div className="table-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      )}

      {isCancelConfirmOpen && (
        <ConfirmDialog
          title="Cancel this payment?"
          tone="danger"
          confirmLabel="Cancel Payment"
          cancelLabel="Keep Waiting"
          onConfirm={handleCancel}
          onCancel={() => setIsCancelConfirmOpen(false)}
          message="The customer will no longer be able to approve this payment session."
        />
      )}
    </Modal>
  );
}
