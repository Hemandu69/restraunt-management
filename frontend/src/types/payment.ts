export type PaymentStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

export interface WaiterPayment {
  id: string;
  tableNumber: number;
  orderReference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
}

/** Only present on the create-payment response - see backend payment.service.ts. */
export interface CreatedPayment extends WaiterPayment {
  token: string;
}

/** The public /pay/:token page never receives waiterId or the token itself. */
export interface PublicPayment {
  tableNumber: number;
  orderReference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt: string | null;
}
