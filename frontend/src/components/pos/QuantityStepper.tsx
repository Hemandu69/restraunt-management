interface QuantityStepperProps {
  quantity: number;
  itemName: string;
  onIncrement: () => void;
  onDecrement: () => void;
}

// Shared by menu cards (adding items) and the order panel (adjusting
// quantities already in the order) so the interaction feels identical in
// both places. Buttons are sized as large touch targets on purpose.
export function QuantityStepper({ quantity, itemName, onIncrement, onDecrement }: QuantityStepperProps) {
  return (
    <div className="qty-stepper">
      <button type="button" onClick={onDecrement} aria-label={`Remove one ${itemName}`}>
        −
      </button>
      <span className="qty-stepper-value" aria-live="polite">
        {quantity}
      </span>
      <button type="button" onClick={onIncrement} aria-label={`Add one more ${itemName}`}>
        +
      </button>
    </div>
  );
}
