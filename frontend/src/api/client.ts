import axios from "axios";

// The backend authenticates via an httpOnly cookie, so every request must
// carry credentials. The API base URL is configurable per environment.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
  withCredentials: true,
});

export interface ApiErrorShape {
  success: false;
  error: { code: string; message: string };
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorShape | undefined;
    if (data?.error?.message) return data.error.message;
    if (error.code === "ERR_NETWORK") return "Could not reach the server. Check your connection and try again.";
  }
  return fallback;
}
