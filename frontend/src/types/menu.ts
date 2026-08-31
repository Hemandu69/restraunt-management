// Shapes mirror the future menu_categories/menu_items database tables (see
// root README "Data architecture") so swapping this static dataset for a
// real API call later is a data-source change, not a UI rewrite.
export interface MenuCategory {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  /** Whole INR rupees - no paise in this menu. */
  price: number;
  available: boolean;
}
