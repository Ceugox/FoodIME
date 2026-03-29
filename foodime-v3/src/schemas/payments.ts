import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(['PIX', 'CREDIT_CARD']),
  cardToken: z.string().optional(),
});

export const syncPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase()),
});

export const createCouponSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase()),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  discount: z.number().min(0),
  usageLimit: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateCouponSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase()).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  discount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});
