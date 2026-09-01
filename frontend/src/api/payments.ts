import { apiClient } from "./client";
import type { CreatedPayment, PublicPayment, WaiterPayment } from "../types/payment";

export interface CreatePaymentPayload {
  tableNumber: number;
  orderReference: string;
  lines: { itemId: string; quantity: number }[];
}

// Deliberately no `amount` field - the backend computes it from `lines`
// against its own menu price list. See createPaymentSchema on the backend.
export async function createPayment(payload: CreatePaymentPayload): Promise<CreatedPayment> {
  const res = await apiClient.post("/payments", payload);
  return res.data.data.payment as CreatedPayment;
}

export async function cancelPayment(id: string): Promise<WaiterPayment> {
  const res = await apiClient.post(`/payments/${id}/cancel`);
  return res.data.data.payment as WaiterPayment;
}

// Authoritative refresh used after a socket reconnect (spec section 28) -
// never used for polling.
export async function getPaymentById(id: string): Promise<WaiterPayment> {
  const res = await apiClient.get(`/payments/${id}`);
  return res.data.data.payment as WaiterPayment;
}

export async function getPublicPayment(token: string): Promise<PublicPayment> {
  const res = await apiClient.get(`/payments/token/${token}`);
  return res.data.data.payment as PublicPayment;
}

export async function approvePublicPayment(token: string): Promise<PublicPayment> {
  const res = await apiClient.post(`/payments/token/${token}/approve`);
  return res.data.data.payment as PublicPayment;
}
