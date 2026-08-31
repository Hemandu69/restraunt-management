import type { MenuItem } from "../../types/menu";
import { formatInr } from "../../lib/money";
import { QuantityStepper } from "./QuantityStepper";

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

// Quick-add by design: one tap adds the item and immediately reveals the
// stepper in its place - no separate page or dialog per item.
export function MenuItemCard({ item, quantity, onAdd, onIncrement, onDecrement }: MenuItemCardProps) {
  return (
    <div className={`menu-item-card${quantity > 0 ? " in-order" : ""}`}>
      <div>
        <div className="menu-item-name">{item.name}</div>
        {item.description && <div className="menu-item-description">{item.description}</div>}
      </div>
      <div className="menu-item-footer">
        <span className="menu-item-price">{formatInr(item.price)}</span>
        {quantity > 0 ? (
          <QuantityStepper
            quantity={quantity}
            itemName={item.name}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
          />
        ) : (
          <button type="button" className="btn-add" onClick={onAdd}>
            + Add
          </button>
        )}
      </div>
    </div>
  );
}
