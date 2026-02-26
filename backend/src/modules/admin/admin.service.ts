import { BadRequestException, Injectable, Logger } from '@nestjs/common';

const PENDING_EXPIRY_MS = 20 * 60 * 1000;
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(role?: string, search?: string) {
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: users };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        store: true,
      },
    });

    return { data: user };
  }

  async updateUser(id: string, data: { name?: string; email?: string; phone?: string; role?: string }) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: data as any,
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    return { data: updated };
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Usuário removido com sucesso' };
  }

  async getSellerDashboard(sellerId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: sellerId },
      select: { id: true, name: true, email: true, store: true },
    });

    if (!user.store) {
      return { data: { user, store: null, metrics: null, recentOrders: [] } };
    }

    const storeId = user.store.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalOrders, monthOrders, payments] = await Promise.all([
      this.prisma.order.count({ where: { storeId } }),
      this.prisma.order.findMany({
        where: {
          storeId,
          status: { in: ['PAID', 'PICKED_UP'] },
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.payment.aggregate({
        where: { order: { storeId }, status: 'PAID' },
        _sum: { grossAmount: true, commission: true, netAmount: true },
        _count: true,
      }),
    ]);

    const monthRevenue = monthOrders.reduce((s, o) => s + Number(o.totalAmount), 0);

    const recentOrders = await this.prisma.order.findMany({
      where: { storeId },
      include: {
        buyer: { select: { name: true } },
        payment: { select: { status: true, method: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      data: {
        user: { id: user.id, name: user.name, email: user.email },
        store: user.store,
        metrics: {
          totalOrders,
          monthRevenue,
          monthOrders: monthOrders.length,
          totalGross: Number(payments._sum.grossAmount || 0),
          totalCommission: Number(payments._sum.commission || 0),
          totalNet: Number(payments._sum.netAmount || 0),
          totalPayments: payments._count,
        },
        recentOrders,
      },
    };
  }

  async getBuyerHistory(buyerId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: buyerId },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });

    const orders = await this.prisma.order.findMany({
      where: { buyerId },
      include: {
        store: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
        payment: { select: { status: true, method: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalSpent = orders
      .filter((o) => o.status === 'PAID' || o.status === 'PICKED_UP')
      .reduce((s, o) => s + Number(o.totalAmount), 0);

    return { data: { user, orders, totalSpent, totalOrders: orders.length } };
  }

  async updateStoreCommission(storeId: string, rate: number) {
    if (rate < 0 || rate > 0.30) {
      throw new BadRequestException('Taxa deve estar entre 0 e 0.30 (0% a 30%)');
    }

    const store = await this.prisma.store.update({
      where: { id: storeId },
      data: { commissionRate: rate },
      select: { id: true, name: true, commissionRate: true },
    });

    return { data: store };
  }

  async getTransactions(method?: string, status?: string) {
    const where: any = {};
    if (method) where.method = method;
    if (status) where.status = status;

    const payments = await this.prisma.payment.findMany({
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
      take: 100,
    });

    const totals = await this.prisma.payment.aggregate({
      where: { ...where, status: 'PAID' },
      _sum: { grossAmount: true, commission: true, netAmount: true },
      _count: true,
    });

    return {
      data: {
        payments: payments.map((p) => ({
          id: p.id,
          orderCode: p.order.code,
          buyerName: p.order.buyer.name,
          storeName: p.order.store.name,
          method: p.method,
          status: p.status,
          grossAmount: Number(p.grossAmount),
          commission: Number(p.commission),
          netAmount: Number(p.netAmount),
          createdAt: p.createdAt,
        })),
        totals: {
          count: totals._count,
          gross: Number(totals._sum.grossAmount || 0),
          commission: Number(totals._sum.commission || 0),
          net: Number(totals._sum.netAmount || 0),
        },
      },
    };
  }

  async getPayoutOverview() {
    const stores = await this.prisma.store.findMany({
      include: { owner: { select: { name: true } } },
    });

    const result = await Promise.all(
      stores.map(async (store) => {
        const [earned, paid] = await Promise.all([
          this.prisma.payment.aggregate({
            where: { order: { storeId: store.id }, status: 'PAID' },
            _sum: { netAmount: true },
          }),
          this.prisma.payout.aggregate({
            where: { storeId: store.id },
            _sum: { amount: true },
          }),
        ]);

        const totalEarned = Number(earned._sum.netAmount || 0);
        const totalPaid = Number(paid._sum.amount || 0);

        return {
          storeId: store.id,
          storeName: store.name,
          sellerName: store.owner.name,
          totalEarned,
          totalPaid,
          balance: totalEarned - totalPaid,
        };
      }),
    );

    return { data: result };
  }

  async createPayout(storeId: string, amount: number, note?: string) {
    const store = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId } });

    if (amount <= 0) {
      throw new BadRequestException('Valor do repasse deve ser positivo');
    }

    const payout = await this.prisma.payout.create({
      data: { storeId: store.id, amount, note },
    });

    return { data: payout };
  }

  async getStorePayouts(storeId: string) {
    const payouts = await this.prisma.payout.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });

    return { data: payouts };
  }

  async getDashboardOverview() {
    // Limpar pedidos PENDING expirados (>20min) antes de contar
    const cutoff = new Date(Date.now() - 20 * 60 * 1000);
    const expired = await this.prisma.order.findMany({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
      select: { id: true },
    });
    if (expired.length > 0) {
      const ids = expired.map((o) => o.id);
      await this.prisma.$transaction([
        this.prisma.payment.deleteMany({ where: { orderId: { in: ids } } }),
        this.prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } }),
        this.prisma.order.deleteMany({ where: { id: { in: ids } } }),
      ]);
    }

    const [userCounts, orderCounts, paymentTotals] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { grossAmount: true, commission: true, netAmount: true },
        _count: true,
      }),
    ]);

    const users: Record<string, number> = {};
    userCounts.forEach((u) => { users[u.role] = u._count; });

    const orders: Record<string, number> = {};
    orderCounts.forEach((o) => { orders[o.status] = o._count; });

    return {
      data: {
        users,
        orders,
        payments: {
          count: paymentTotals._count,
          gross: Number(paymentTotals._sum.grossAmount || 0),
          commission: Number(paymentTotals._sum.commission || 0),
          net: Number(paymentTotals._sum.netAmount || 0),
        },
      },
    };
  }
}
