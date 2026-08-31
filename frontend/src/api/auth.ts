import { apiClient } from "./client";
import type { User } from "../types/user";

export async function login(email: string, password: string): Promise<User> {
  const res = await apiClient.post("/auth/login", { email, password });
  return res.data.data.user as User;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await apiClient.get("/auth/me");
  return res.data.data.user as User;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
