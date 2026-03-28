import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/api/errors';
import { sendSellerApprovedEmail, sendSellerRejectedEmail } from '@/lib/email';

export async function getDashboardOverview() {
  const [users, orders, payments] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: true, where: { deletedAt: null } }),
    prisma.order.groupBy({ by: ['status'], _count: true }),
    prisma.payment.aggregate({
      _sum: { grossAmount: true, commission: true, netAmount: true },
      where: { status: 'PAID' },
    }),
  ]);

  const usersByRole = Object.fromEntries(users.map((u) => [u.role, u._count]));
  const ordersByStatus = Object.fromEntries(orders.map((o) => [o.status, o._count]));

  return {
    data: {
      users: {
        total: Object.values(usersByRole).reduce((a, b) => a + b, 0),
        buyers: usersByRole.BUYER || 0,
        sellers: usersByRole.SELLER || 0,
        admins: usersByRole.ADMIN || 0,
      },
      orders: {
        total: Object.values(ordersByStatus).reduce((a, b) => a + b, 0),
        pending: ordersByStatus.PENDING || 0,
        paid: ordersByStatus.PAID || 0,
        cancelled: ordersByStatus.CANCELLED || 0,
      },
      payments: {
        grossRevenue: Number(payments._sum.grossAmount || 0),
        commission: Number(payments._sum.commission || 0),
        netPayout: Number(payments._sum.netAmount || 0),
      },
    },
  };
}

export async function getUsers(query: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { role, status, search, page = 1, limit = 20 } = query;
  const where: any = { deletedAt: null };

  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, status: true, phone: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { data: users, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function getUser(id: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    include: { store: { select: { id: true, name: true, isOpen: true, commissionRate: true } } },
  });
  return { data: user };
}

export async function updateUserStatus(id: string, status: 'ACTIVE' | 'BLOCKED', reason?: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id } });

  await prisma.user.update({ where: { id }, data: { status } });

  if (status === 'ACTIVE' && user.status === 'PENDING' && user.role === 'SELLER') {
    await sendSellerApprovedEmail(user.email, user.name);
  }

  if (status === 'BLOCKED') {
    if (user.role === 'SELLER') {
      await prisma.store.updateMany({ where: { ownerId: id }, data: { isOpen: false } });
      await sendSellerRejectedEmail(user.email, reason);
    }
    await prisma.refreshToken.deleteMany({ where: { userId: id } });
  }

  return { message: 'Status atualizado' };
}

export async function updateUser(id: string, data: { name?: string; email?: string; phone?: string; role?: string }) {
  const user = await prisma.user.update({ where: { id }, data: data as any });
  return { data: user };
}

export async function deleteUser(id: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'BLOCKED' } }),
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
  ]);
  return { message: 'Usuário removido' };
}

export async function getSellerDashboard(sellerId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sellerId },
    include: { store: true },
  });

  if (!user.store) throw new AppError(404, 'Vendedor não possui loja');

  const [totalOrders, monthPayments, recentOrders] = await Promise.all([
    prisma.order.count({ where: { storeId: user.store.id } }),
    prisma.payment.aggregate({
      _sum: { grossAmount: true, commission: true, netAmount: true },
      where: {
        order: { storeId: user.store.id },
        status: 'PAID',
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.order.findMany({
      where: { storeId: user.store.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { buyer: { select: { name: true } } },
    }),
  ]);

  return {
    data: {
      user: { id: user.id, name: user.name, email: user.email, status: user.status },
      store: user.store,
      metrics: {
        totalOrders,
        monthRevenue: Number(monthPayments._sum.grossAmount || 0),
        monthCommission: Number(monthPayments._sum.commission || 0),
        monthNet: Number(monthPayments._sum.netAmount || 0),
      },
      recentOrders,
    },
  };
}

export async function getBuyerHistory(buyerId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: buyerId } });

  const [orders, stats] = await Promise.all([
    prisma.order.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { store: { select: { name: true } } },
    }),
    prisma.order.aggregate({
      _count: true,
      _sum: { totalAmount: true },
      where: { buyerId, status: { in: ['PAID', 'READY', 'PICKED_UP'] } },
    }),
  ]);

  return {
    data: {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      metrics: {
        totalOrders: stats._count,
        totalSpent: Number(stats._sum.totalAmount || 0),
        avgTicket: stats._count > 0 ? Number(stats._sum.totalAmount || 0) / stats._count : 0,
      },
      orders,
    },
  };
}

export async function getStores() {
  const stores = await prisma.store.findMany({
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  return { data: stores };
}

export async function updateStoreCommission(storeId: string, commissionRate: number) {
  if (commissionRate < 0 || commissionRate > 0.3) throw new AppError(400, 'Comissão deve ser entre 0% e 30%');
  const store = await prisma.store.update({ where: { id: storeId }, data: { commissionRate } });
  return { data: store };
}

export async function getTransactions(query: {
  method?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { method, status, page = 1, limit = 20 } = query;
  const where: any = {};
  if (method) where.method = method;
  if (status) where.status = status;

  const [payments, total, aggregates] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        order: {
          select: {
            code: true,
            buyer: { select: { name: true } },
            store: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      _sum: { grossAmount: true, commission: true, netAmount: true },
      where: { ...where, status: 'PAID' },
    }),
  ]);

  return {
    data: payments,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
    aggregates: {
      grossTotal: Number(aggregates._sum.grossAmount || 0),
      commissionTotal: Number(aggregates._sum.commission || 0),
      netTotal: Number(aggregates._sum.netAmount || 0),
    },
  };
}

export async function getPayoutOverview() {
  const stores = await prisma.store.findMany({
    include: {
      owner: { select: { name: true } },
      _count: { select: { orders: true } },
    },
  });

  const storeData = await Promise.all(
    stores.map(async (store) => {
      const [earned, paid] = await Promise.all([
        prisma.payment.aggregate({
          _sum: { netAmount: true },
          where: { order: { storeId: store.id }, status: 'PAID' },
        }),
        prisma.payout.aggregate({
          _sum: { amount: true },
          where: { storeId: store.id },
        }),
      ]);

      const totalEarned = Number(earned._sum.netAmount || 0);
      const totalPaid = Number(paid._sum.amount || 0);

      return {
        storeId: store.id,
        storeName: store.name,
        ownerName: store.owner.name,
        totalEarned,
        totalPaid,
        balance: totalEarned - totalPaid,
      };
    }),
  );

  const totals = storeData.reduce(
    (acc, s) => ({
      earned: acc.earned + s.totalEarned,
      paid: acc.paid + s.totalPaid,
      balance: acc.balance + s.balance,
    }),
    { earned: 0, paid: 0, balance: 0 },
  );

  return { data: storeData, totals };
}

export async function createPayout(data: { storeId: string; amount: number; note?: string }) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: data.storeId } });

  const [earned, paid] = await Promise.all([
    prisma.payment.aggregate({ _sum: { netAmount: true }, where: { order: { storeId: data.storeId }, status: 'PAID' } }),
    prisma.payout.aggregate({ _sum: { amount: true }, where: { storeId: data.storeId } }),
  ]);

  const balance = Number(earned._sum.netAmount || 0) - Number(paid._sum.amount || 0);
  if (data.amount > balance) throw new AppError(400, `Valor excede saldo disponível (R$ ${balance.toFixed(2)})`);

  const payout = await prisma.payout.create({
    data: { storeId: data.storeId, amount: data.amount, note: data.note || null },
  });
  return { data: payout };
}

export async function getStorePayouts(storeId: string) {
  const payouts = await prisma.payout.findMany({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
  });
  return { data: payouts };
}
