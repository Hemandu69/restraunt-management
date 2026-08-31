import { Modal } from "../Modal";
import { Alert } from "../Alert";
import { calculateTotals, formatInr } from "../../lib/money";
import type { OrderLine } from "./OrderPanel";

interface BillSummaryModalProps {
  tableNumber: number;
  lines: OrderLine[];
  onClose: () => void;
  onStartNewOrder: () => void;
}

// Payment is future work (see root README) - this deliberately stops at an
// itemized summary rather than pretending to process anything. "Start New
// Order" is the local stand-in for "table becomes available again".
export function BillSummaryModal({ tableNumber, lines, onClose, onStartNewOrder }: BillSummaryModalProps) {
  const totals = calculateTotals(lines.map((line) => ({ price: line.item.price, quantity: line.quantity })));

  return (
    <Modal title="Bill" description={`Table ${tableNumber}`} onClose={onClose}>
      <div className="stack" style={{ gap: "0.4rem" }}>
        {lines.map(({ item, quantity }) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
            <span>
              {item.name} <span className="muted">× {quantity}</span>
            </span>
            <span>{formatInr(item.price * quantity)}</span>
          </div>
        ))}
      </div>

      <div className="pos-order-summary" style={{ padding: "0.75rem 0 0" }}>
        <div className="pos-order-summary-row">
          <span>Subtotal</span>
          <span>{formatInr(totals.subtotal)}</span>
        </div>
        <div className="pos-order-summary-row">
          <span>Tax</span>
          <span>{formatInr(totals.tax)}</span>
        </div>
        <div className="pos-order-total-row">
          <span className="label">Total</span>
          <span className="value">{formatInr(totals.total)}</span>
        </div>
      </div>

      <Alert tone="info">Payment is not implemented yet - this bill is not saved anywhere.</Alert>

      <div className="table-actions">
        <button type="button" className="btn btn-primary" onClick={onStartNewOrder}>
          Start New Order
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Back to Order
        </button>
      </div>
    </Modal>
  );
}
