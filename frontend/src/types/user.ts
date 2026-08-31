export type Role = "MANAGER" | "WAITER";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
}
