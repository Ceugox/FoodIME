import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import type { UserPayload } from '../../common/decorators/current-user.decorator';

const PENDING_EXPIRY_MS = 20 * 60 * 1000; // 20 minutos

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deleta permanentemente pedidos PENDING com mais de 20 minutos.
   * Deleta primeiro os OrderItems (FK) e depois os Orders.
   */
  async cleanupExpiredOrders(): Promise<number> {
    const cutoff = new Date(Date.now() - PENDING_EXPIRY_MS);

    const expired = await this.prisma.order.findMany({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
      select: { id: true },
    });

    if (expired.length === 0) return 0;

    const ids = expired.map((o) => o.id);

    // Deletar em ordem: payments -> orderItems -> orders
    await this.prisma.$transaction([
      this.prisma.payment.deleteMany({ where: { orderId: { in: ids } } }),
      this.prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } }),
      this.prisma.order.deleteMany({ where: { id: { in: ids } } }),
    ]);

    this.logger.log(`Deleted ${ids.length} expired PENDING orders`);
    return ids.length;
  }

  async create(dto: CreateOrderDto, user: UserPayload) {
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: dto.items.map((i) => i.productId) },
        storeId: dto.storeId,
        isAvailable: true,
      },
    });

    if (products.length !== dto.items.length) {
      throw new BadRequestException('Um ou mais produtos não estão disponíveis');
    }

    // Verificar stock
    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product || product.stockQty < item.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente para "${product?.name || item.productId}"`,
        );
      }
    }

    // Calcular total com snapshot de preço
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

    // Gerar código único de 6 caracteres
    const code = this.generateOrderCode();

    const order = await this.prisma.order.create({
      data: {
        buyerId: user.id,
        storeId: dto.storeId,
        totalAmount,
        code,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: { product: { select: { name: true, imageUrl: true } } },
        },
        store: { select: { id: true, name: true } },
      },
    });

    return { data: order };
  }

  async findByBuyer(user: UserPayload) {
    // Limpar pedidos expirados antes de listar
    await this.cleanupExpiredOrders();

    const orders = await this.prisma.order.findMany({
      where: {
        buyerId: user.id,
      },
      include: {
        items: {
          include: { product: { select: { name: true, imageUrl: true } } },
        },
        store: { select: { id: true, name: true } },
        payment: { select: { status: true, method: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: orders };
  }

  async findBySeller(user: UserPayload) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId: user.id },
    });

    if (!store) {
      return { data: [] };
    }

    const orders = await this.prisma.order.findMany({
      where: {
        storeId: store.id,
        status: { in: ['PAID', 'PICKED_UP'] },
      },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
        buyer: { select: { id: true, name: true, phone: true } },
        payment: { select: { status: true, method: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: orders };
  }

  async findOne(id: string, user: UserPayload) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        items: {
          include: { product: { select: { name: true, imageUrl: true } } },
        },
        store: { select: { id: true, name: true } },
        buyer: { select: { id: true, name: true, phone: true } },
        payment: true,
      },
    });

    // Verificar se o usuário é o buyer ou o seller
    if (order.buyerId !== user.id) {
      const store = await this.prisma.store.findUnique({
        where: { id: order.storeId, ownerId: user.id },
      });
      if (!store && user.role !== 'ADMIN') {
        throw new ForbiddenException('Acesso negado a este pedido');
      }
    }

    return { data: order };
  }

  async updateStatus(id: string, status: string, user: UserPayload) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: { store: true },
    });

    if (order.store.ownerId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas o vendedor pode atualizar o status');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: status as any },
    });

    return { data: updated };
  }

  async getSellerMetrics(user: UserPayload) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId: user.id },
    });

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

    // Pedidos pagos por período
    const [todayOrders, weekOrders, monthOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          storeId: store.id,
          status: { in: ['PAID', 'PICKED_UP'] },
          createdAt: { gte: startOfDay },
        },
      }),
      this.prisma.order.findMany({
        where: {
          storeId: store.id,
          status: { in: ['PAID', 'PICKED_UP'] },
          createdAt: { gte: startOfWeek },
        },
      }),
      this.prisma.order.findMany({
        where: {
          storeId: store.id,
          status: { in: ['PAID', 'PICKED_UP'] },
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    const sumRevenue = (orders: typeof todayOrders) =>
      orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    // Receita por dia da semana (últimos 7 dias)
    const weeklyChart: { day: string; revenue: number }[] = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayRevenue = weekOrders
        .filter((o) => {
          const d = new Date(o.createdAt);
          return d >= dayStart && d < dayEnd;
        })
        .reduce((sum, o) => sum + Number(o.totalAmount), 0);

      weeklyChart.push({ day: dayNames[dayStart.getDay()], revenue: dayRevenue });
    }

    // Produto mais vendido no mês
    const monthOrderIds = monthOrders.map((o) => o.id);
    let topProduct: { name: string; totalSold: number } | null = null;

    if (monthOrderIds.length > 0) {
      const items = await this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { orderId: { in: monthOrderIds } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 1,
      });

      if (items.length > 0) {
        const product = await this.prisma.product.findUnique({
          where: { id: items[0].productId },
          select: { name: true },
        });
        topProduct = {
          name: product?.name || 'Desconhecido',
          totalSold: items[0]._sum.quantity || 0,
        };
      }
    }

    // Transações recentes com comissão
    const recentPayments = await this.prisma.payment.findMany({
      where: {
        order: { storeId: store.id },
        status: 'PAID',
      },
      include: {
        order: {
          select: { code: true, createdAt: true, totalAmount: true },
        },
      },
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
        revenue: {
          today: sumRevenue(todayOrders),
          week: sumRevenue(weekOrders),
          month: sumRevenue(monthOrders),
        },
        orders: {
          today: todayOrders.length,
          week: weekOrders.length,
          month: monthOrders.length,
        },
        weeklyChart,
        topProduct,
        transactions,
      },
    };
  }

  private generateOrderCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
