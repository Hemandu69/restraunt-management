import { TABLE_COUNT } from "../../data/tables";
import type { TableAvailability } from "../../types/order";
import { formatInr } from "../../lib/money";

interface TableSelectorProps {
  availability: Record<number, TableAvailability>;
  /** Real current-order total for tables with an open order; only shown when > 0, never fabricated. */
  openOrderTotals: Record<number, number>;
  onSelect: (tableNumber: number) => void;
}

// An occupancy board, not a list of buttons: the Waiter should be able to
// read every table's state at a glance, without clicking anything.
// Availability is explicit Waiter-maintained floor state (see
// types/order.ts) - it is never derived from whether a table happens to
// have order items, so a table can read OCCUPIED with no order yet, or
// AVAILABLE while an order is still open.
export function TableSelector({ availability, openOrderTotals, onSelect }: TableSelectorProps) {
  const tables = Array.from({ length: TABLE_COUNT }, (_, i) => i + 1);

  return (
    <div className="table-board">
      {tables.map((tableNumber) => {
        const isOccupied = availability[tableNumber] === "OCCUPIED";
        const orderTotal = openOrderTotals[tableNumber] ?? 0;
        return (
          <button
            key={tableNumber}
            type="button"
            className={`table-card${isOccupied ? " occupied" : " available"}`}
            onClick={() => onSelect(tableNumber)}
          >
            <span className="table-card-number">Table {tableNumber}</span>
            <span className="table-card-status">
              <span className="table-card-dot" aria-hidden="true" />
              {isOccupied ? "Occupied" : "Available"}
            </span>
            {orderTotal > 0 && <span className="table-card-order-info">{formatInr(orderTotal)} current order</span>}
          </button>
        );
      })}
    </div>
  );
}
