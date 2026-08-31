import { NextFunction, Request, Response } from "express";
import { Permission, roleHasPermission } from "../authorization/permissions";
import { ApiError } from "../utils/ApiError";

// Reusable permission gate. Route definitions declare the permission they
// require; this middleware is the single place that turns "role" into
// "allowed/denied" so future modules only need to add entries to the
// permission catalog, never duplicate this check.
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthenticated());
    }
    if (!roleHasPermission(req.user.role, permission)) {
      return next(ApiError.forbidden());
    }
    next();
  };
}
