import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/api/errors';
import * as mp from '@/lib/mercadopago';
import type { UserPayload } from '@/lib/jwt';

function resolveMercadoPagoPayerEmail(email: string): string {
  const sandboxEmail = process.env.MERCADOPAGO_TEST_PAYER_EMAIL?.trim();

  if (sandboxEmail) {
    return sandboxEmail;
  }

  return email;
}

async function confirmOrderWithStockDecrement(orderId: string): Promise<boolean> {
  let stockFailed = false;

  try {
    await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: { items: { include: { product: true } } },
        });

        if (order.status === 'PAID') {
          await tx.payment.updateMany({ where: { orderId }, data: { status: 'PAID' } });
          return;
        }

        for (const item of order.items) {
          const updated = await tx.product.updateMany({
            where: { id: item.productId, stockQty: { gte: item.quantity } },
            data: { stockQty: { decrement: item.quantity } },
          });
          if (updated.count === 0) {
            stockFailed = true;
            throw new Error('STOCK_INSUFFICIENT');
          }
        }

        await tx.payment.update({ where: { orderId }, data: { status: 'PAID' } });
        await tx.order.update({ where: { id: orderId }, data: { status: 'PAID' } });
      },
      { isolationLevel: 'Serializable' },
    );
    return true;
  } catch {
    if (stockFailed) return false;
    throw new Error('Transaction failed');
  }
}

export async function initiatePayment(
  orderId: string,
  method: 'PIX' | 'CREDIT_CARD',
  user: UserPayload,
  _cardToken?: string,
) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      store: true,
      buyer: { select: { email: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });

  if (order.buyerId !== user.id) throw new AppError(400, 'Você não é o comprador deste pedido');
  if (order.status !== 'PENDING') throw new AppError(400, 'Pedido não está pendente');

  // Duplicate prevention
  const existing = await prisma.payment.findFirst({ where: { orderId, status: { not: 'FAILED' } } });
  if (existing) throw new AppError(409, 'Já existe um pagamento ativo para este pedido');

  const amountInCents = Math.round(Number(order.totalAmount) * 100);
  const commissionPercent = Number(order.store.commissionRate) * 100;
  const payerEmail = resolveMercadoPagoPayerEmail(order.buyer.email);

  let gatewayTxId: string;
  let pixQrCode: string | null = null;
  let pixQrCodeBase64: string | null = null;

  if (method === 'PIX') {
    const result = await mp.createPixPayment({ amount: amountInCents, orderId, payerEmail });
    gatewayTxId = result.id;
    pixQrCode = result.pixQrCode;
    pixQrCodeBase64 = result.pixQrCodeBase64;
  } else {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const returnUrl = `${appUrl}/checkout/${orderId}`;
    const notificationUrl = /localhost|127\.0\.0\.1/.test(appUrl)
      ? undefined
      : `${appUrl}/api/payments/webhook`;

    const result = await mp.createCheckoutPreference({
      orderId,
      items: order.items.map((item) => ({
        title: item.product.name,
        quantity: item.quantity,
        unitPrice: Number(item.priceAtPurchase),
      })),
      returnUrl,
      notificationUrl,
    });
    gatewayTxId = result.id;

    return {
      data: {
        gatewayTxId,
        method,
        checkoutUrl: result.checkoutUrl,
      },
    };
  }

  const commission = (Number(order.totalAmount) * commissionPercent) / 100;
  const netAmount = Number(order.totalAmount) - commission;

  await prisma.payment.create({
    data: { orderId, method, gatewayTxId, grossAmount: order.totalAmount, commission, netAmount, status: 'PROCESSING' },
  });

  return {
    data: {
      gatewayTxId,
      method,
      ...(pixQrCode && { pixQrCode }),
      ...(pixQrCodeBase64 && { pixQrCodeBase64 }),
    },
  };
}

async function resolveOrderForGatewayPayment(payment: any) {
  const externalOrderId = payment?.external_reference?.toString() || payment?.metadata?.order_id?.toString();

  if (externalOrderId) {
    return prisma.order.findUnique({
      where: { id: externalOrderId },
      include: { store: true },
    });
  }

  const existingPayment = await prisma.payment.findFirst({
    where: { gatewayTxId: String(payment?.id || '') },
    include: { order: { include: { store: true } } },
  });

  return existingPayment?.order || null;
}

function getMethodFromGatewayPayment(payment: any): 'PIX' | 'CREDIT_CARD' {
  if (payment?.payment_method_id === 'pix' || payment?.payment_type_id === 'bank_transfer') {
    return 'PIX';
  }

  return 'CREDIT_CARD';
}

async function upsertGatewayPaymentRecord(order: { id: string; totalAmount: any; store: { commissionRate: any } }, payment: any, status: 'PROCESSING' | 'FAILED') {
  const commission = Number(order.totalAmount) * Number(order.store.commissionRate);
  const netAmount = Number(order.totalAmount) - commission;

  await prisma.payment.upsert({
    where: { orderId: order.id },
    update: {
      method: getMethodFromGatewayPayment(payment),
      gatewayTxId: String(payment.id),
      grossAmount: order.totalAmount,
      commission,
      netAmount,
      status,
    },
    create: {
      orderId: order.id,
      method: getMethodFromGatewayPayment(payment),
      gatewayTxId: String(payment.id),
      grossAmount: order.totalAmount,
      commission,
      netAmount,
      status,
    },
  });
}

export async function handleOrderPaid(paymentOrGatewayTxId: any) {
  const paymentData = typeof paymentOrGatewayTxId === 'string'
    ? { id: paymentOrGatewayTxId }
    : paymentOrGatewayTxId;

  let order = await resolveOrderForGatewayPayment(paymentData);

  if (!order && typeof paymentOrGatewayTxId === 'string') {
    const existingPayment = await prisma.payment.findFirst({
      where: { gatewayTxId: paymentOrGatewayTxId },
      include: { order: { include: { store: true } } },
    });
    order = existingPayment?.order || null;
  }

  if (!order) return;

  await upsertGatewayPaymentRecord(order, paymentData, 'PROCESSING');

  const stockOk = await confirmOrderWithStockDecrement(order.id);
  if (!stockOk) {
    try { await mp.refundPayment(String(paymentData.id)); } catch (e) { console.error('Refund failed:', e); }
    await prisma.$transaction([
      prisma.payment.update({ where: { orderId: order.id }, data: { status: 'REFUNDED', refundReason: 'Estoque insuficiente' } }),
      prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } }),
    ]);
  }
}

export async function handlePaymentFailed(paymentOrGatewayTxId: any) {
  const paymentData = typeof paymentOrGatewayTxId === 'string'
    ? { id: paymentOrGatewayTxId }
    : paymentOrGatewayTxId;

  let order = await resolveOrderForGatewayPayment(paymentData);

  if (!order && typeof paymentOrGatewayTxId === 'string') {
    const existingPayment = await prisma.payment.findFirst({
      where: { gatewayTxId: paymentOrGatewayTxId },
      include: { order: { include: { store: true } } },
    });
    order = existingPayment?.order || null;
  }

  if (!order) return;

  await upsertGatewayPaymentRecord(order, paymentData, 'FAILED');

  if (order.status === 'PENDING') {
    await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
  }
}

export async function syncPaymentStatus(orderId: string, paymentId: string, user: UserPayload) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { id: true, buyerId: true },
  });

  if (order.buyerId !== user.id) throw new AppError(403, 'Acesso negado');

  const payment = await mp.getPayment(paymentId);
  const paymentOrderId = payment?.external_reference?.toString() || payment?.metadata?.order_id?.toString();

  if (paymentOrderId && paymentOrderId !== orderId) {
    throw new AppError(400, 'Pagamento não pertence a este pedido');
  }

  if (payment.status === 'approved') {
    await handleOrderPaid(payment);
  } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
    await handlePaymentFailed(payment);
  }

  return {
    data: {
      paymentId: String(payment.id),
      status: payment.status as string,
      statusDetail: payment.status_detail as string | undefined,
    },
  };
}

export async function getPaymentByOrder(orderId: string, user: UserPayload) {
  const payment = await prisma.payment.findUnique({
    where: { orderId },
    include: { order: { select: { buyerId: true, store: { select: { ownerId: true } } } } },
  });

  if (!payment) {
    return { data: null };
  }

  const isBuyer = payment.order.buyerId === user.id;
  const isSeller = payment.order.store.ownerId === user.id;
  if (!isBuyer && !isSeller && user.role !== 'ADMIN') throw new AppError(403, 'Acesso negado');

  const { order: _, ...paymentData } = payment;
  return { data: paymentData };
}
