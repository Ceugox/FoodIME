import { z } from 'zod';

export const createOrderSchema = z.object({
  storeId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
    }),
  ).min(1, 'Pedido deve ter pelo menos 1 item'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PAID', 'READY', 'PICKED_UP', 'CANCELLED']),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
