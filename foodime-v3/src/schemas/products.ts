import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  price: z.number().positive('Preço deve ser positivo'),
  stockQty: z.number().int().min(0, 'Estoque não pode ser negativo'),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export const updateProductSchema = createProductSchema.partial();

export const updateStockSchema = z.object({
  stockQty: z.number().int().min(0, 'Estoque não pode ser negativo'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
