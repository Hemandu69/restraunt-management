import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { createWaiterSchema, updateWaiterSchema } from "../validation/waiter.schemas";
import { createWaiterUser, getWaiterById, listWaiters, updateWaiter } from "../services/waiter.service";
import { ApiError } from "../utils/ApiError";

export const createWaiter = asyncHandler(async (req: Request, res: Response) => {
  const input = createWaiterSchema.parse(req.body);
  const user = await createWaiterUser(input);
  res.status(201).json({ success: true, data: { user } });
});

export const getWaiters = asyncHandler(async (_req: Request, res: Response) => {
  const users = await listWaiters();
  res.status(200).json({ success: true, data: { users } });
});

export const getWaiter = asyncHandler(async (req: Request, res: Response) => {
  const user = await getWaiterById(req.params.id);
  res.status(200).json({ success: true, data: { user } });
});

export const patchWaiter = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthenticated();
  const input = updateWaiterSchema.parse(req.body);
  const user = await updateWaiter(req.params.id, input, req.user.id);
  res.status(200).json({ success: true, data: { user } });
});
