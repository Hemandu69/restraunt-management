import type { MenuItem } from "../../types/menu";
import { calculateTotals, formatInr } from "../../lib/money";
import { QuantityStepper } from "./QuantityStepper";

export interface OrderLine {
  item: MenuItem;
  quantity: number;
}

interface OrderPanelProps {
  tableNumber: number;
  lines: OrderLine[];
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
  onGenerateBill: () => void;
  onCancelOrder: () => void;
  /** Present only on mobile, where this panel doubles as a slide-in drawer. */
  onClose?: () => void;
  /** Mobile-only: adds the drawer's "slid into view" state. No-op on desktop, where the panel is always visible via sticky positioning. */
  isOpen?: boolean;
}

export function OrderPanel({
  tableNumber,
  lines,
  onIncrement,
  onDecrement,
  onGenerateBill,
  onCancelOrder,
  onClose,
  isOpen,
}: OrderPanelProps) {
  const totals = calculateTotals(lines.map((line) => ({ price: line.item.price, quantity: line.quantity })));
  const hasItems = lines.length > 0;

  return (
    <aside className={`pos-order-panel${isOpen ? " open" : ""}`} aria-label="Current order">
      <div className="pos-order-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2>Current Order</h2>
          {onClose && (
            <button type="button" className="btn btn-ghost btn-sm pos-order-close" onClick={onClose} aria-label="Close order panel">
              ✕
            </button>
          )}
        </div>
        <span className="table-badge">Table {tableNumber}</span>
      </div>

      <div className="pos-order-lines">
        {hasItems ? (
          lines.map(({ item, quantity }) => (
            <div className="pos-order-line" key={item.id}>
              <div className="pos-order-line-info">
                <div className="pos-order-line-name">{item.name}</div>
                <div className="pos-order-line-price">
                  {quantity} × {formatInr(item.price)}
                </div>
              </div>
              <QuantityStepper
                quantity={quantity}
                itemName={item.name}
                onIncrement={() => onIncrement(item.id)}
                onDecrement={() => onDecrement(item.id)}
              />
              <span className="pos-order-line-total">{formatInr(item.price * quantity)}</span>
            </div>
          ))
        ) : (
          <div className="pos-order-empty">
            No items added yet.
            <br />
            Select items from the menu to start the order.
          </div>
        )}
      </div>

      <div className="pos-order-summary">
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
        <button type="button" className="btn btn-primary" style={{ width: "100%" }} disabled={!hasItems} onClick={onGenerateBill}>
          Generate Bill
        </button>
        {hasItems && (
          <button
            type="button"
            className="btn btn-danger"
            style={{ width: "100%", marginTop: "0.6rem" }}
            onClick={onCancelOrder}
          >
            Cancel Order
          </button>
        )}
      </div>
    </aside>
  );
}
