import { Role } from "../constants/roles";

// Permission catalog. Only permissions actually enforced by a real route are
// listed here - future modules (tables, orders, billing, menu, ...) will
// extend this object and the ROLE_PERMISSIONS map below without touching
// authentication or the authorization middleware itself. Deliberately does
// NOT include permissions for modules that don't exist yet (VIEW_TABLES,
// CREATE_ORDER, VIEW_MENU, ...) - adding those now would be unenforceable
// and misleading.
export const PERMISSIONS = {
  VIEW_WAITERS: "VIEW_WAITERS",
  CREATE_WAITER: "CREATE_WAITER",
  UPDATE_WAITER: "UPDATE_WAITER",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Static role -> permission map. Keeping this data-driven (rather than
// scattering `if (role === "MANAGER")` checks through controllers) is what
// lets later phases add permissions/roles without rewriting the middleware.
//
// MANAGER is the overview/management role (waiter administration today;
// menu/sales/reports management in later phases). WAITER is the operational
// role - it holds no permissions yet because no operational module (tables,
// orders, billing) has been built; this is not an oversight.
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  MANAGER: [PERMISSIONS.VIEW_WAITERS, PERMISSIONS.CREATE_WAITER, PERMISSIONS.UPDATE_WAITER],
  WAITER: [],
};

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}
