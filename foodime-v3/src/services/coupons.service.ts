import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/api/errors';

export async function createCoupon(data: {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  discount: number;
  usageLimit?: number;
  expiresAt?: string;
}) {
  const coupon = await prisma.coupon.create({
    data: {
      code: data.code.toUpperCase(),
      type: data.type,
      discount: data.discount,
      usageLimit: data.usageLimit ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });
  return { data: coupon };
}

export async function listCoupons() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  return { data: coupons };
}

export async function updateCoupon(id: string, data: {
  code?: string;
  type?: 'PERCENTAGE' | 'FIXED';
  discount?: number;
  usageLimit?: number;
  expiresAt?: string;
  isActive?: boolean;
}) {
  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      ...data,
      code: data.code?.toUpperCase(),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });
  return { data: coupon };
}

export async function removeCoupon(id: string) {
  await prisma.coupon.delete({ where: { id } });
  return { message: 'Cupom removido' };
}

export async function validateCoupon(code: string) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon) throw new AppError(404, 'Cupom não encontrado');
  if (!coupon.isActive) throw new AppError(400, 'Cupom inativo');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError(400, 'Cupom expirado');
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new AppError(400, 'Cupom esgotado');

  await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });

  return {
    data: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discount: Number(coupon.discount),
    },
  };
}
