import { z } from "zod";
import { TABLE_COUNT } from "../constants/tables";

// The client sends WHAT to pay for (table, order reference, item lines) -
// never HOW MUCH. amount is computed server-side from these lines against
// the authoritative menu price list (see services/payment.service.ts). This
// is what makes a forged { amount: 1 } request impossible: there is no
// amount field here to forge.
export const createPaymentSchema = z.object({
  tableNumber: z.number().int().min(1).max(TABLE_COUNT),
  orderReference: z.string().trim().min(1).max(200),
  lines: z
    .array(
      z.object({
        itemId: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, "A payment must include at least one item."),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
