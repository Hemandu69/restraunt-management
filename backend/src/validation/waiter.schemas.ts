import { z } from "zod";
import { Role } from "../constants/roles";

// Deliberately has no `role` field: even if a client sends one, Zod's
// default behaviour strips unknown keys, and the service layer hard-codes
// role = WAITER regardless of what reaches it.
export const createWaiterSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().email("A valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

export const updateWaiterSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email("A valid email is required.").optional(),
    role: z.nativeEnum(Role).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });
