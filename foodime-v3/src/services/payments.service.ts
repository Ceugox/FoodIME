import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/api/errors';
import * as mp from '@/lib/mercadopago';
import type { UserPayload } from '@/lib/jwt';

const CARD_REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_insufficient_amount: 'Saldo insuficiente no cartão.',
  cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido.',
  cc_rejected_bad_filled_date: 'Data de validade inválida.',
  cc_rejected_bad_filled_other: 'Dados do cartão inválidos. Verifique e tente novamente.',
  cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
  cc_rejected_call_for_authorize: 'Você precisa autorizar o pagamento junto ao banco emissor.',
  cc_rejected_card_disabled: 'Cartão desabilitado. Entre em contato com o banco emissor.',
  cc_rejected_duplicated_payment: 'Pagamento duplicado.',
  cc_rejected_high_risk: 'Pagamento recusado por motivo de segurança.',
  cc_rejected_max_attempts: 'Número máximo de tentativas excedido. Use outro cartão.',
  cc_rejected_other_reason: 'Pagamento recusado pelo banco emissor.',
};

async function confirmOrderWithStockDecrement(orderId: string): Promise<boolean> {
  let stockFailed = false;

  try {
    await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: { items: { include: { product: true } } },
        });

        if (order.status === 'PAID') return;

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
  cardToken?: string,
) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { store: true, buyer: { select: { email: true } } },
  });

  if (order.buyerId !== user.id) throw new AppError(400, 'Você não é o comprador deste pedido');
  if (order.status !== 'PENDING') throw new AppError(400, 'Pedido não está pendente');

  // Duplicate prevention
  const existing = await prisma.payment.findFirst({ where: { orderId, status: { not: 'FAILED' } } });
  if (existing) throw new AppError(409, 'Já existe um pagamento ativo para este pedido');

  const amountInCents = Math.round(Number(order.totalAmount) * 100);
  const commissionPercent = Number(order.store.commissionRate) * 100;

  let gatewayTxId: string;
  let pixQrCode: string | null = null;
  let pixQrCodeBase64: string | null = null;

  if (method === 'PIX') {
    const result = await mp.createPixPayment({ amount: amountInCents, orderId, payerEmail: order.buyer.email });
    gatewayTxId = result.id;
    pixQrCode = result.pixQrCode;
    pixQrCodeBase64 = result.pixQrCodeBase64;
  } else {
    if (!cardToken) throw new AppError(400, 'cardToken obrigatório para cartão de crédito');
    const result = await mp.createCardPayment({ amount: amountInCents, orderId, cardToken, payerEmail: order.buyer.email });
    gatewayTxId = result.id;

    if (result.status === 'approved') {
      const commissionVal = (Number(order.totalAmount) * commissionPercent) / 100;
      const netVal = Number(order.totalAmount) - commissionVal;

      await prisma.payment.create({
        data: { orderId, method, gatewayTxId, grossAmount: order.totalAmount, commission: commissionVal, netAmount: netVal, status: 'PROCESSING' },
      });

      const stockOk = await confirmOrderWithStockDecrement(orderId);
      if (!stockOk) {
        try { await mp.refundPayment(gatewayTxId); } catch (e) { console.error('Refund failed:', e); }
        await prisma.$transaction([
          prisma.payment.update({ where: { orderId }, data: { status: 'REFUNDED', refundReason: 'Estoque insuficiente' } }),
          prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } }),
        ]);
        throw new AppError(400, 'Estoque insuficiente. Pagamento estornado automaticamente.');
      }
      return { data: { gatewayTxId, method } };
    }

    if (result.status === 'rejected') {
      throw new AppError(400, CARD_REJECTION_MESSAGES[result.statusDetail ?? ''] ?? 'Pagamento recusado.');
    }
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

export async function handleOrderPaid(gatewayTxId: string) {
  const payment = await prisma.payment.findFirst({ where: { gatewayTxId } });
  if (!payment) return;

  const stockOk = await confirmOrderWithStockDecrement(payment.orderId);
  if (!stockOk) {
    try { await mp.refundPayment(payment.gatewayTxId); } catch (e) { console.error('Refund failed:', e); }
    await prisma.$transaction([
      prisma.payment.update({ where: { orderId: payment.orderId }, data: { status: 'REFUNDED', refundReason: 'Estoque insuficiente' } }),
      prisma.order.update({ where: { id: payment.orderId }, data: { status: 'CANCELLED' } }),
    ]);
  }
}

export async function handlePaymentFailed(gatewayTxId: string) {
  const payment = await prisma.payment.findFirst({ where: { gatewayTxId } });
  if (!payment) return;

  await prisma.$transaction([
    prisma.payment.update({ where: { orderId: payment.orderId }, data: { status: 'FAILED' } }),
    prisma.order.update({ where: { id: payment.orderId }, data: { status: 'CANCELLED' } }),
  ]);
}

export async function getPaymentByOrder(orderId: string, user: UserPayload) {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { orderId },
    include: { order: { select: { buyerId: true, store: { select: { ownerId: true } } } } },
  });

  const isBuyer = payment.order.buyerId === user.id;
  const isSeller = payment.order.store.ownerId === user.id;
  if (!isBuyer && !isSeller && user.role !== 'ADMIN') throw new AppError(403, 'Acesso negado');

  const { order: _, ...paymentData } = payment;
  return { data: paymentData };
}
