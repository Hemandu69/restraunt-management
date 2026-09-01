import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requirePermission } from "../middleware/authorize";
import { PERMISSIONS } from "../authorization/permissions";
import {
  getPaymentByIdRoute,
  getPublicPayment,
  postApprovePayment,
  postCancelPayment,
  postPayment,
} from "../controllers/payments.controller";

const router = Router();

// Deliberately NOT `router.use(authenticate)` like waiters.routes.ts - this
// router mixes authenticated Waiter routes with the public, unauthenticated
// customer-facing token routes (spec section 7: the public payment page
// must not require login). Each route below states its own auth
// requirement instead.
//
// Route shapes are adjusted slightly from the spec's illustrative examples
// (GET /api/payments/:token, POST /api/payments/:token/approve) to
// GET/POST /api/payments/token/:token[...] - this avoids ambiguity with the
// authenticated GET /api/payments/:id / POST /api/payments/:id/cancel
// routes, which need to exist as their own path shape for the Waiter's
// socket-reconnect authoritative refresh (spec section 28) and cancel flow.

// --- Authenticated (Waiter) ------------------------------------------------
router.post("/", authenticate, requirePermission(PERMISSIONS.CREATE_PAYMENT), postPayment);
router.get("/:id", authenticate, getPaymentByIdRoute);
router.post("/:id/cancel", authenticate, requirePermission(PERMISSIONS.CANCEL_PAYMENT), postCancelPayment);

// --- Public (customer /pay/:token page) ------------------------------------
router.get("/token/:token", getPublicPayment);
router.post("/token/:token/approve", postApprovePayment);

export default router;
