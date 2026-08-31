import type { Role } from "../types/user";

// The single source of truth for "where does this role land": used after
// login, after a role-mismatch redirect, and as the catch-all redirect
// target. Waiters land on Tables - their future operational workspace
// (table selection -> order -> bill) - not a Manager-style dashboard.
export function getHomeRouteForRole(role: Role): string {
  return role === "MANAGER" ? "/dashboard" : "/tables";
}
