// Mirrors the future restaurant_tables.availability and orders.status
// columns (see root README "Data architecture") so this stays a drop-in
// data-source swap later, not a UI rewrite.
//
// These are deliberately separate concepts, not one derived from the
// other: a table's availability is set explicitly by the Waiter (floor
// management), while an order's status tracks that specific order's own
// lifecycle. A table can be OCCUPIED with no order yet, and an order can
// be CANCELLED while the Waiter still decides the table's availability.
export type TableAvailability = "AVAILABLE" | "OCCUPIED";

export type OrderStatus = "OPEN" | "COMPLETED" | "CANCELLED";
