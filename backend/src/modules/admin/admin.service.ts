import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getUsers(role?: string, search?: string, status?: string, page = 1, limit = 20) {
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
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateUserStatus(id: string, status: 'ACTIVE' | 'BLOCKED', reason?: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { store: true },
    });

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    // Close store when blocking a seller
    if (status === 'BLOCKED' && user.store) {
      await this.prisma.store.update({
        where: { id: user.store.id },
        data: { isOpen: false },
      });
    }

    if (status === 'ACTIVE' && user.role === 'SELLER') {
      const storeName = user.store?.name || 'sua loja';
      await this.emailService.sendSellerApprovedEmail(user.email, storeName);
    } else if (status === 'BLOCKED') {
      await this.emailService.sendSellerRejectedEmail(user.email, reason);
    }

    return { data: updated };
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
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { store: true },
    });

    // Soft delete: set deletedAt + block + invalidate tokens
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'BLOCKED' },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      // If seller, close their store
      ...(user.store
        ? [this.prisma.store.update({ where: { id: user.store.id }, data: { isOpen: false } })]
        : []),
    ]);

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

  async getStores() {
    const stores = await this.prisma.store.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: 'asc' },
    });

    return { data: stores };
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

  async getTransactions(method?: string, status?: string, page = 1, limit = 50) {
    const where: any = {};
    if (method) where.method = method;
    if (status) where.status = status;

    const [payments, total, totals] = await Promise.all([
      this.prisma.payment.findMany({
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
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({
        where: { ...where, status: 'PAID' },
        _sum: { grossAmount: true, commission: true, netAmount: true },
        _count: true,
      }),
    ]);

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
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPayoutOverview() {
    // Optimized: single raw query instead of N+1 loop
    const result = await this.prisma.$queryRaw<
      Array<{
        storeId: string;
        storeName: string;
        sellerName: string;
        totalEarned: number;
        totalPaid: number;
      }>
    >`
      SELECT
        s."id" AS "storeId",
        s."name" AS "storeName",
        u."name" AS "sellerName",
        COALESCE((
          SELECT SUM(p."netAmount")
          FROM "Payment" p
          JOIN "Order" o ON o."id" = p."orderId"
          WHERE o."storeId" = s."id" AND p."status" = 'PAID'
        ), 0)::float AS "totalEarned",
        COALESCE((
          SELECT SUM(po."amount")
          FROM "Payout" po
          WHERE po."storeId" = s."id"
        ), 0)::float AS "totalPaid"
      FROM "Store" s
      JOIN "User" u ON u."id" = s."ownerId"
    `;

    return {
      data: result.map((r) => ({
        ...r,
        balance: r.totalEarned - r.totalPaid,
      })),
    };
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
    // Expired order cleanup moved to OrdersCron (EVERY_5_MINUTES)
    const [userCounts, orderCounts, paymentTotals] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        where: { deletedAt: null },
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
