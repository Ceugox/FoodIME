import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/api/errors';
import type { UserPayload } from '@/lib/jwt';
import type { CreateOrderInput } from '@/schemas/orders';

const PENDING_EXPIRY_MS = 20 * 60 * 1000;

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['READY', 'CANCELLED'],
  READY: ['PICKED_UP'],
  PICKED_UP: [],
  CANCELLED: [],
};

function generateOrderCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function cleanupExpiredOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - PENDING_EXPIRY_MS);
  const expired = await prisma.order.findMany({
    where: { status: 'PENDING', createdAt: { lt: cutoff } },
    select: { id: true },
  });

  if (expired.length === 0) return 0;

  const ids = expired.map((o) => o.id);
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { orderId: { in: ids } } }),
    prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } }),
    prisma.order.deleteMany({ where: { id: { in: ids } } }),
  ]);

  console.log(`Deleted ${ids.length} expired PENDING orders`);
  return ids.length;
}

export async function createOrder(dto: CreateOrderInput, user: UserPayload) {
  const products = await prisma.product.findMany({
    where: {
      id: { in: dto.items.map((i) => i.productId) },
      storeId: dto.storeId,
      isAvailable: true,
    },
  });

  if (products.length !== dto.items.length) {
    throw new AppError(400, 'Um ou mais produtos não estão disponíveis');
  }

  for (const item of dto.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || product.stockQty < item.quantity) {
      throw new AppError(400, `Estoque insuficiente para "${product?.name || item.productId}"`);
    }
  }

  let totalAmount = new Prisma.Decimal(0);
  const orderItems = dto.items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const itemTotal = product.price.mul(item.quantity);
    totalAmount = totalAmount.add(itemTotal);
    return {
      productId: item.productId,
      quantity: item.quantity,
      priceAtPurchase: product.price,
    };
  });

  let order;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const code = generateOrderCode();
      order = await prisma.order.create({
        data: {
          buyerId: user.id,
          storeId: dto.storeId,
          totalAmount,
          code,
          items: { create: orderItems },
        },
        include: {
          items: { include: { product: { select: { name: true, imageUrl: true } } } },
          store: { select: { id: true, name: true } },
        },
      });
      break;
    } catch (error: any) {
      if (error.code === 'P2002' && attempt < 4) continue;
      throw error;
    }
  }

  return { data: order };
}

export async function findByBuyer(user: UserPayload) {
  await cleanupExpiredOrders();

  const orders = await prisma.order.findMany({
    where: { buyerId: user.id },
    include: {
      items: { include: { product: { select: { name: true, imageUrl: true } } } },
      store: { select: { id: true, name: true } },
      payment: { select: { status: true, method: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { data: orders };
}

export async function findBySeller(user: UserPayload) {
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return { data: [] };

  const orders = await prisma.order.findMany({
    where: {
      storeId: store.id,
      status: { in: ['PAID', 'READY', 'PICKED_UP'] },
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      buyer: { select: { id: true, name: true, phone: true } },
      payment: { select: { status: true, method: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { data: orders };
}

export async function findOrder(id: string, user: UserPayload) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: {
      items: { include: { product: { select: { name: true, imageUrl: true } } } },
      store: { select: { id: true, name: true } },
      buyer: { select: { id: true, name: true, phone: true } },
      payment: true,
    },
  });

  if (order.buyerId !== user.id) {
    const store = await prisma.store.findUnique({
      where: { id: order.storeId, ownerId: user.id },
    });
    if (!store && user.role !== 'ADMIN') {
      throw new AppError(403, 'Acesso negado a este pedido');
    }
  }

  return { data: order };
}

export async function updateOrderStatus(id: string, status: string, user: UserPayload) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: { store: true },
  });

  if (order.store.ownerId !== user.id && user.role !== 'ADMIN') {
    throw new AppError(403, 'Apenas o vendedor pode atualizar o status');
  }

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(400, `Transição de ${order.status} para ${status} não é permitida`);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: status as any },
  });

  return { data: updated };
}

export async function getSellerMetrics(user: UserPayload) {
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) {
    return {
      data: {
        revenue: { today: 0, week: 0, month: 0 },
        orders: { today: 0, week: 0, month: 0 },
        weeklyChart: [],
        topProduct: null,
        transactions: [],
      },
    };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthOrders = await prisma.order.findMany({
    where: {
      storeId: store.id,
      status: { in: ['PAID', 'READY', 'PICKED_UP'] },
      createdAt: { gte: startOfMonth },
    },
  });

  const weekOrders = monthOrders.filter((o) => o.createdAt >= startOfWeek);
  const todayOrders = monthOrders.filter((o) => o.createdAt >= startOfDay);

  const sumRevenue = (orders: typeof todayOrders) =>
    orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const weeklyChart: { day: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayRevenue = weekOrders
      .filter((o) => o.createdAt >= dayStart && o.createdAt < dayEnd)
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);
    weeklyChart.push({ day: dayNames[dayStart.getDay()], revenue: dayRevenue });
  }

  const monthOrderIds = monthOrders.map((o) => o.id);
  let topProduct: { name: string; totalSold: number } | null = null;

  if (monthOrderIds.length > 0) {
    const items = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { orderId: { in: monthOrderIds } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 1,
    });

    if (items.length > 0) {
      const product = await prisma.product.findUnique({
        where: { id: items[0].productId },
        select: { name: true },
      });
      topProduct = { name: product?.name || 'Desconhecido', totalSold: items[0]._sum.quantity || 0 };
    }
  }

  const recentPayments = await prisma.payment.findMany({
    where: { order: { storeId: store.id }, status: 'PAID' },
    include: { order: { select: { code: true, createdAt: true, totalAmount: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const transactions = recentPayments.map((p) => ({
    id: p.id,
    orderCode: p.order.code,
    date: p.createdAt,
    grossAmount: Number(p.grossAmount),
    commission: Number(p.commission),
    netAmount: Number(p.netAmount),
    method: p.method,
  }));

  return {
    data: {
      revenue: { today: sumRevenue(todayOrders), week: sumRevenue(weekOrders), month: sumRevenue(monthOrders) },
      orders: { today: todayOrders.length, week: weekOrders.length, month: monthOrders.length },
      weeklyChart,
      topProduct,
      transactions,
    },
  };
}
