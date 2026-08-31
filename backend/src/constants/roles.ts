// SQLite has no native enum type, so `role`/`status` are plain TEXT columns
// constrained by CHECK constraints in the migration SQL. These are the single
// source of truth for valid values on the application side.
export const Role = {
  MANAGER: "MANAGER",
  WAITER: "WAITER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
