// Authoritative server-side menu prices, used only to verify/compute a
// payment's amount from the item ids and quantities a client sends - see
// services/payment.service.ts. The backend never trusts a client-supplied
// amount (see PAYMENT.md / the payment feature report).
//
// This intentionally duplicates the price half of frontend/src/data/menu.ts
// (id -> price only, none of the display fields) rather than importing it:
// frontend and backend are two separate npm packages with no shared module
// boundary between them (see the rest of this codebase), and a real "Menu"
// backend module doesn't exist yet (menu management is still a documented
// future phase - see the frontend file's own comment). Keeping this file
// name-for-name in the same order as the frontend dataset is what makes the
// two easy to diff/keep in sync until a real shared menu module replaces
// both. If a real menu API is ever built, this file is deleted, not grown.
export const MENU_PRICES: Record<string, number> = {
  // Starters
  "st-01": 280,
  "st-02": 320,
  "st-03": 220,
  "st-04": 240,
  "st-05": 300,
  "st-06": 350,
  "st-07": 180,
  "st-08": 260,
  "st-09": 340,
  "st-10": 180,

  // Main Course
  "mc-01": 380,
  "mc-02": 300,
  "mc-03": 320,
  "mc-04": 260,
  "mc-05": 340,
  "mc-06": 290,
  "mc-07": 220,
  "mc-08": 420,
  "mc-09": 310,
  "mc-10": 240,
  "mc-11": 320,

  // Breads
  "br-01": 60,
  "br-02": 50,
  "br-03": 70,
  "br-04": 30,
  "br-05": 70,
  "br-06": 50,
  "br-07": 90,

  // Rice & Biryani
  "rb-01": 320,
  "rb-02": 260,
  "rb-03": 400,
  "rb-04": 150,
  "rb-05": 120,
  "rb-06": 260,
  "rb-07": 220,

  // Beverages
  "bv-01": 60,
  "bv-02": 60,
  "bv-03": 90,
  "bv-04": 70,
  "bv-05": 30,
  "bv-06": 110,
  "bv-07": 130,
  "bv-08": 50,

  // Desserts
  "ds-01": 90,
  "ds-02": 110,
  "ds-03": 80,
  "ds-04": 150,
  "ds-05": 100,
  "ds-06": 120,
  "ds-07": 100,
};
