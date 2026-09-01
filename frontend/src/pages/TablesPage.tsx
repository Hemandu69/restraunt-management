import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { MENU_ITEMS } from "../data/menu";
import { TABLE_COUNT } from "../data/tables";
import { MenuBrowser } from "../components/pos/MenuBrowser";
import { OrderPanel } from "../components/pos/OrderPanel";
import type { OrderLine } from "../components/pos/OrderPanel";
import { TableSelector } from "../components/pos/TableSelector";
import { TableAvailabilityToggle } from "../components/pos/TableAvailabilityToggle";
import { BillSummaryModal } from "../components/pos/BillSummaryModal";
import { QrPaymentModal } from "../components/pos/QrPaymentModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../context/ToastContext";
import { calculateTotals, formatInr } from "../lib/money";
import type { OrderStatus, TableAvailability } from "../types/order";

interface TableOrder {
  status: OrderStatus;
  items: Record<string, number>;
  /** Opaque, client-generated label for this order - see QrPaymentModal/payment.service.ts for why it's informational only, never trusted for amount or authorization. */
  orderReference: string;
}

type TableAvailabilityMap = Record<number, TableAvailability>;
type TableOrders = Record<number, TableOrder>;

// Stable reference for "no open order" so derived useMemo/useEffect
// dependencies don't see a new object identity on every render.
const EMPTY_QUANTITIES: Record<string, number> = {};

function getOrderTotal(order: TableOrder | undefined): number {
  if (!order || order.status !== "OPEN") return 0;
  const lines = Object.entries(order.items).map(([itemId, quantity]) => ({
    price: MENU_ITEMS.find((item) => item.id === itemId)?.price ?? 0,
    quantity,
  }));
  return calculateTotals(lines).total;
}

// Waiter's primary workspace: select a table, browse the menu, build the
// order, generate the bill. Order state is in-memory only, keyed per table
// so switching tables doesn't lose either table's progress for the rest of
// the session - but nothing here is persisted to a server yet (no
// tables/orders backend module exists), so a page reload resets everything.
// That's a known, documented limitation, not an oversight.
//
// Table availability and order status are deliberately separate pieces of
// state (see types/order.ts): availability defaults to AVAILABLE for every
// table and changes only when the Waiter explicitly sets it via the
// toggle - it is never inferred from whether a table has an order.
export function TablesPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [availability, setAvailability] = useState<TableAvailabilityMap>({});
  const [ordersByTable, setOrdersByTable] = useState<TableOrders>({});
  const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [isQrPaymentOpen, setIsQrPaymentOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const currentOrder = selectedTable !== null ? ordersByTable[selectedTable] : undefined;
  const currentQuantities = currentOrder?.status === "OPEN" ? currentOrder.items : EMPTY_QUANTITIES;

  const currentLines: OrderLine[] = useMemo(
    () =>
      Object.entries(currentQuantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemId, quantity]) => ({ item: MENU_ITEMS.find((item) => item.id === itemId)!, quantity }))
        .filter((line) => line.item),
    [currentQuantities]
  );

  const openOrderTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (const [table, order] of Object.entries(ordersByTable)) {
      totals[Number(table)] = getOrderTotal(order);
    }
    return totals;
  }, [ordersByTable]);

  // Lock page scroll behind the mobile order drawer while it's open.
  useEffect(() => {
    if (!isOrderPanelOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOrderPanelOpen]);

  function setQuantity(itemId: string, quantity: number) {
    if (selectedTable === null) return;
    setOrdersByTable((prev) => {
      const existing = prev[selectedTable];
      // Starting fresh: no order yet, or the previous one was cancelled or
      // completed (paid) - a new item begins a brand new OPEN order (with
      // its own new orderReference) rather than reviving the old one.
      const isContinuing = existing?.status === "OPEN";
      const items = isContinuing ? { ...existing.items } : {};
      const orderReference = isContinuing ? existing.orderReference : crypto.randomUUID();
      if (quantity <= 0) {
        delete items[itemId];
      } else {
        items[itemId] = quantity;
      }
      return { ...prev, [selectedTable]: { status: "OPEN", items, orderReference } };
    });
  }

  function handleAdd(itemId: string) {
    setQuantity(itemId, 1);
  }

  function handleIncrement(itemId: string) {
    setQuantity(itemId, (currentQuantities[itemId] ?? 0) + 1);
  }

  function handleDecrement(itemId: string) {
    setQuantity(itemId, (currentQuantities[itemId] ?? 0) - 1);
  }

  function handleChangeTable() {
    setSelectedTable(null);
    setIsOrderPanelOpen(false);
  }

  function handleSetAvailability(tableNumber: number, next: TableAvailability) {
    setAvailability((prev) => ({ ...prev, [tableNumber]: next }));
    toast.success(`Table ${tableNumber} marked as ${next === "AVAILABLE" ? "available" : "occupied"}.`);
  }

  function handleOpenQrPayment() {
    setIsBillOpen(false);
    setIsQrPaymentOpen(true);
  }

  // Called once by QrPaymentModal when its payment reaches PAID. Marks the
  // order COMPLETED (not deleted, for a future order-history view) rather
  // than resetting it immediately - the modal itself stays open showing
  // "Payment Successful" until the Waiter closes it. Once COMPLETED,
  // currentQuantities already reads as empty (same mechanism as a
  // CANCELLED order - see EMPTY_QUANTITIES above), so the table is
  // immediately ready for its next order with no further state to reset.
  // Table availability is untouched - it's the Waiter's own separate,
  // manual control (see types/order.ts).
  function handlePaymentSuccess() {
    if (selectedTable === null) return;
    setOrdersByTable((prev) => {
      const existing = prev[selectedTable];
      if (!existing) return prev;
      return { ...prev, [selectedTable]: { ...existing, status: "COMPLETED" } };
    });
  }

  function handleConfirmCancelOrder() {
    if (selectedTable === null) return;
    // Retained with status CANCELLED (not deleted) so it could feed a
    // future order-history view; the active-order UI simply stops showing
    // it because currentQuantities only reads OPEN orders.
    setOrdersByTable((prev) => {
      const existing = prev[selectedTable];
      if (!existing) return prev;
      return { ...prev, [selectedTable]: { ...existing, status: "CANCELLED" } };
    });
    setIsCancelConfirmOpen(false);
    setIsOrderPanelOpen(false);
    toast.success(`Order cancelled for Table ${selectedTable}.`);
  }

  if (!user) return null;

  // Step 1: no table chosen yet.
  if (selectedTable === null) {
    const occupiedCount = Object.values(availability).filter((state) => state === "OCCUPIED").length;

    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Tables</h1>
            <p className="muted">Select a table to start or continue an order.</p>
            <p className="table-board-summary">
              {TABLE_COUNT} Tables · {TABLE_COUNT - occupiedCount} Available · {occupiedCount} Occupied
            </p>
          </div>
        </div>

        <TableSelector availability={availability} openOrderTotals={openOrderTotals} onSelect={setSelectedTable} />
      </div>
    );
  }

  // Step 2: table chosen - menu + order workspace.
  const totals = calculateTotals(currentLines.map((line) => ({ price: line.item.price, quantity: line.quantity })));
  const currentAvailability: TableAvailability = availability[selectedTable] ?? "AVAILABLE";

  return (
    <div className="pos-shell">
      <div className="pos-topbar">
        <div className="pos-topbar-context">
          <span className="table-badge">Table {selectedTable}</span>
          <TableAvailabilityToggle
            value={currentAvailability}
            onChange={(next) => handleSetAvailability(selectedTable, next)}
          />
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleChangeTable}>
          Change table
        </button>
      </div>

      <div className="pos-layout">
        <MenuBrowser
          quantities={currentQuantities}
          onAdd={handleAdd}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />

        {/* One element, styled two ways by index.css: a persistent sticky
            panel on desktop, a slide-in drawer (controlled by `isOpen`) on
            mobile - not two separate renders. */}
        {isOrderPanelOpen && <div className="pos-order-backdrop" onClick={() => setIsOrderPanelOpen(false)} />}
        <OrderPanel
          tableNumber={selectedTable}
          lines={currentLines}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onGenerateBill={() => setIsBillOpen(true)}
          onCancelOrder={() => setIsCancelConfirmOpen(true)}
          onClose={() => setIsOrderPanelOpen(false)}
          isOpen={isOrderPanelOpen}
        />
      </div>

      {!isOrderPanelOpen && (
        <button type="button" className="pos-order-fab" onClick={() => setIsOrderPanelOpen(true)}>
          <span>{currentLines.reduce((sum, l) => sum + l.quantity, 0)} items · View Order</span>
          <span className="pos-order-fab-total">{formatInr(totals.total)}</span>
        </button>
      )}

      {isBillOpen && (
        <BillSummaryModal
          tableNumber={selectedTable}
          lines={currentLines}
          onClose={() => setIsBillOpen(false)}
          onPayByQr={handleOpenQrPayment}
        />
      )}

      {isQrPaymentOpen && currentOrder && (
        <QrPaymentModal
          tableNumber={selectedTable}
          orderReference={currentOrder.orderReference}
          lines={currentLines}
          onClose={() => setIsQrPaymentOpen(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {isCancelConfirmOpen && (
        <ConfirmDialog
          title="Cancel this order?"
          tone="danger"
          confirmLabel="Cancel Order"
          cancelLabel="Keep Order"
          onConfirm={handleConfirmCancelOrder}
          onCancel={() => setIsCancelConfirmOpen(false)}
          message={
            <>
              This will cancel the current order for <strong>Table {selectedTable}</strong>. The order is kept on
              record but won't count as a sale.
            </>
          }
        />
      )}
    </div>
  );
}
