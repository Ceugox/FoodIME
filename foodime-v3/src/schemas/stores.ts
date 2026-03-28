import { z } from 'zod';

export const createStoreSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().min(5, 'Descrição deve ter pelo menos 5 caracteres'),
  whatsapp: z.string().min(10, 'WhatsApp inválido'),
  pixKey: z.string().min(1, 'Chave Pix é obrigatória'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
});

export const updateStoreSchema = createStoreSchema.partial();

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
