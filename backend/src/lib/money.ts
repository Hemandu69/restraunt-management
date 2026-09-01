// Mirrors frontend/src/lib/money.ts exactly (same TAX_RATE, same rounding
// rule) so a payment's backend-computed amount always matches what the
// Waiter's bill screen displayed. See data/menuPrices.ts for why this is a
// duplicated file rather than a shared import.
export const TAX_RATE = 0.05;

export interface BillLine {
  price: number;
  quantity: number;
}

export interface BillTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export function calculateTotals(lines: BillLine[]): BillTotals {
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  return { subtotal, tax, total: subtotal + tax };
}
