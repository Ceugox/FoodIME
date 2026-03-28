import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/api/errors';
import type { UserPayload } from '@/lib/jwt';
import type { CreateStoreInput, UpdateStoreInput } from '@/schemas/stores';

export async function createStore(dto: CreateStoreInput, user: UserPayload) {
  const existing = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (existing) throw new AppError(409, 'Usuário já possui uma loja');

  const store = await prisma.store.create({
    data: { ...dto, ownerId: user.id },
  });

  return { data: store };
}

export async function findAllStores(search?: string) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : { isOpen: true };

  const stores = await prisma.store.findMany({
    where,
    include: {
      products: {
        where: { isAvailable: true },
        select: { id: true, name: true, price: true, imageUrl: true, stockQty: true, isAvailable: true, storeId: true },
      },
    },
  });

  return { data: stores };
}

export async function findStore(id: string) {
  const store = await prisma.store.findUniqueOrThrow({
    where: { id },
    include: {
      products: {
        where: { isAvailable: true },
        select: { id: true, name: true, price: true, imageUrl: true, stockQty: true, isAvailable: true, storeId: true },
      },
      owner: { select: { id: true, name: true } },
    },
  });

  return { data: store };
}

export async function findMyStore(user: UserPayload) {
  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    include: { products: true },
  });

  return { data: store };
}

export async function updateStore(id: string, dto: UpdateStoreInput, user: UserPayload) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id } });
  if (store.ownerId !== user.id) throw new AppError(403, 'Você não é o dono desta loja');

  const updated = await prisma.store.update({ where: { id }, data: dto });
  return { data: updated };
}

export async function toggleStoreOpen(id: string, user: UserPayload) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id } });
  if (store.ownerId !== user.id) throw new AppError(403, 'Você não é o dono desta loja');

  const updated = await prisma.store.update({
    where: { id },
    data: { isOpen: !store.isOpen },
  });

  return { data: updated };
}
