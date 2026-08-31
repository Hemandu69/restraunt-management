import { apiClient } from "./client";
import type { Role, User } from "../types/user";

export async function listWaiters(): Promise<User[]> {
  const res = await apiClient.get("/waiters");
  return res.data.data.users as User[];
}

export interface CreateWaiterPayload {
  name: string;
  email: string;
  password: string;
}

export async function createWaiter(payload: CreateWaiterPayload): Promise<User> {
  const res = await apiClient.post("/waiters", payload);
  return res.data.data.user as User;
}

export interface UpdateWaiterPayload {
  name?: string;
  email?: string;
  role?: Role;
}

export async function updateWaiter(id: string, payload: UpdateWaiterPayload): Promise<User> {
  const res = await apiClient.patch(`/waiters/${id}`, payload);
  return res.data.data.user as User;
}
