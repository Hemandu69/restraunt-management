import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requirePermission } from "../middleware/authorize";
import { PERMISSIONS } from "../authorization/permissions";
import { createWaiter, getWaiter, getWaiters, patchWaiter } from "../controllers/waiters.controller";

const router = Router();

// Every route below requires authentication first, then the specific
// permission for that action. Waiter never holds any of these permissions
// (see src/authorization/permissions.ts), so every one of these requests
// from a Waiter token is rejected with 403 regardless of what the frontend
// UI shows.
//
// No status/activation route here on purpose - deactivation is not a
// current application feature. The `status` column and its login-time
// ACTIVE check remain in the data model for possible future account
// administration, but nothing writes to it through this API today.
router.use(authenticate);

router.get("/", requirePermission(PERMISSIONS.VIEW_WAITERS), getWaiters);
router.post("/", requirePermission(PERMISSIONS.CREATE_WAITER), createWaiter);
router.get("/:id", requirePermission(PERMISSIONS.VIEW_WAITERS), getWaiter);
router.patch("/:id", requirePermission(PERMISSIONS.UPDATE_WAITER), patchWaiter);

export default router;
