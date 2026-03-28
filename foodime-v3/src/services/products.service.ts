import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/api/errors';
import type { UserPayload } from '@/lib/jwt';
import type { CreateProductInput, UpdateProductInput } from '@/schemas/products';

export async function createProduct(dto: CreateProductInput, user: UserPayload) {
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) {
    throw new AppError(404, 'Você ainda não possui uma loja cadastrada. Configure sua loja antes de criar produtos.');
  }

  const product = await prisma.product.create({
    data: {
      name: dto.name,
      price: dto.price,
      stockQty: dto.stockQty,
      imageUrl: dto.imageUrl || null,
      storeId: store.id,
    },
  });

  return { data: product };
}

export async function findProductsByStore(storeId: string) {
  const products = await prisma.product.findMany({
    where: { storeId, isAvailable: true },
  });

  return { data: products };
}

export async function findProduct(id: string) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: { store: { select: { id: true, name: true } } },
  });

  return { data: product };
}

export async function updateProduct(id: string, dto: UpdateProductInput, user: UserPayload) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: { store: true },
  });

  if (product.store.ownerId !== user.id) throw new AppError(403, 'Você não é o dono deste produto');

  const updated = await prisma.product.update({ where: { id }, data: dto });
  return { data: updated };
}

export async function removeProduct(id: string, user: UserPayload) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: { store: true },
  });

  if (product.store.ownerId !== user.id) throw new AppError(403, 'Você não é o dono deste produto');

  await prisma.product.update({ where: { id }, data: { isAvailable: false } });
  return { message: 'Produto removido com sucesso' };
}

export async function updateStock(id: string, stockQty: number, user: UserPayload) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: { store: true },
  });

  if (product.store.ownerId !== user.id) throw new AppError(403, 'Você não é o dono deste produto');

  const updated = await prisma.product.update({ where: { id }, data: { stockQty } });
  return { data: updated };
}
