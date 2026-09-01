import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { createPaymentSchema } from "../validation/payment.schemas";
import {
  approvePaymentByToken,
  cancelPayment,
  createPayment,
  getPaymentById,
  getPaymentByToken,
} from "../services/payment.service";

export const postPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthenticated();
  const input = createPaymentSchema.parse(req.body);
  const payment = await createPayment(req.user.id, input);
  res.status(201).json({ success: true, data: { payment } });
});

export const getPaymentByIdRoute = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthenticated();
  const payment = await getPaymentById(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: { payment } });
});

// Public - no `authenticate` middleware on this route. Only the fields a
// customer is allowed to see are ever returned (see toPublicPayment in the
// service layer).
export const getPublicPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await getPaymentByToken(req.params.token);
  res.status(200).json({ success: true, data: { payment } });
});

// Public - no `authenticate` middleware. The token in the URL is the only
// credential; nothing in the request body is trusted (there is no body).
export const postApprovePayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await approvePaymentByToken(req.params.token);
  res.status(200).json({ success: true, data: { payment } });
});

export const postCancelPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthenticated();
  const payment = await cancelPayment(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: { payment } });
});
