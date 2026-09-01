// Mirrors frontend/src/data/tables.ts's TABLE_COUNT, used only to validate
// that a payment's table_number is within the range of tables that
// actually exist in the UI. Tables have no backend persistence yet (see
// that file's own comment), so this is the closest thing to an
// authoritative bound available.
export const TABLE_COUNT = 12;
