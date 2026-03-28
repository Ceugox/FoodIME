import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'BLOCKED']),
  reason: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['BUYER', 'SELLER', 'ADMIN']).optional(),
});

export const updateCommissionSchema = z.object({
  commissionRate: z.number().min(0).max(0.3),
});

export const createPayoutSchema = z.object({
  storeId: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional(),
});
