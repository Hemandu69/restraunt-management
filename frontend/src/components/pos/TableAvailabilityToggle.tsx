import type { TableAvailability } from "../../types/order";

interface TableAvailabilityToggleProps {
  value: TableAvailability;
  onChange: (value: TableAvailability) => void;
}

// The Waiter explicitly maintains floor availability - it is never inferred
// from order state (see types/order.ts). A two-button segmented control
// keeps this a single click from wherever the Waiter is already working,
// with the current state always visually unambiguous.
export function TableAvailabilityToggle({ value, onChange }: TableAvailabilityToggleProps) {
  return (
    <div className="availability-toggle" role="group" aria-label="Table availability">
      <button
        type="button"
        className={`availability-toggle-option${value === "AVAILABLE" ? " active" : ""}`}
        aria-pressed={value === "AVAILABLE"}
        onClick={() => onChange("AVAILABLE")}
      >
        Available
      </button>
      <button
        type="button"
        className={`availability-toggle-option occupied${value === "OCCUPIED" ? " active" : ""}`}
        aria-pressed={value === "OCCUPIED"}
        onClick={() => onChange("OCCUPIED")}
      >
        Occupied
      </button>
    </div>
  );
}
