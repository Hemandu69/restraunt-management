// Temporary development value - GST on restaurant food service is commonly
// 5%. Make this configurable per-restaurant when a settings/menu module
// exists; kept as one named constant (not scattered inline) so that change
// touches one place.
export const TAX_RATE = 0.05;

// All prices in this app are whole INR rupees (no paise), so subtotal is
// already an exact integer; only the tax step needs rounding, done once at
// the end rather than accumulated per line to avoid compounding drift.
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

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}
