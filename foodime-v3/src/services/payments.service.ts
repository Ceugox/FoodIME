import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/api/errors';
import * as efi from '@/lib/efibank';
import type { UserPayload } from '@/lib/jwt';

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
  cardHash?: string,
) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      store: true,
      buyer: { select: { email: true, name: true, cpf: true, phone: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });

  if (order.buyerId !== user.id) throw new AppError(400, 'Você não é o comprador deste pedido');
  if (order.status !== 'PENDING') throw new AppError(400, 'Pedido não está pendente');

  // Duplicate prevention
  const existing = await prisma.payment.findFirst({ where: { orderId, status: { not: 'FAILED' } } });
  if (existing) throw new AppError(409, 'Já existe um pagamento ativo para este pedido');

  const amountInCents = Math.round(Number(order.totalAmount) * 100);
  const commission = Number(order.totalAmount) * Number(order.store.commissionRate);
  const netAmount = Number(order.totalAmount) - commission;

  console.log(`[payments] initiating ${method} for order ${orderId} | amount: R$${(amountInCents / 100).toFixed(2)}`);

  if (method === 'PIX') {
    const result = await efi.createPixCharge({
      amount: amountInCents,
      orderId,
      orderCode: order.code,
    });

    // Store payment record so webhook can look it up by gatewayTxId
    await prisma.payment.create({
      data: {
        orderId,
        method: 'PIX',
        gatewayTxId: result.txid,
        grossAmount: order.totalAmount,
        commission,
        netAmount,
        status: 'PROCESSING',
      },
    });

    return {
      data: {
        gatewayTxId: result.txid,
        method,
        pixCopiaECola: result.pixCopiaECola,
      },
    };
  }

  // CREDIT_CARD
  if (!cardHash) throw new AppError(400, 'Token do cartão é obrigatório');

  const buyer = order.buyer;
  if (!buyer.cpf) throw new AppError(400, 'CPF do comprador é obrigatório para pagamento com cartão');

  const result = await efi.createCardCharge({
    amount: amountInCents,
    orderId,
    cardHash,
    orderCode: order.code,
    customer: {
      name: buyer.name,
      email: buyer.email,
      cpf: buyer.cpf,
      phone: buyer.phone || '21999999999',
    },
  });

  // Store payment record
  await prisma.payment.create({
    data: {
      orderId,
      method: 'CREDIT_CARD',
      gatewayTxId: result.chargeId,
      grossAmount: order.totalAmount,
      commission,
      netAmount,
      status: 'PROCESSING',
    },
  });

  if (result.status === 'approved') {
    await handleOrderPaid(result.chargeId, 'CREDIT_CARD');
    return { data: { gatewayTxId: result.chargeId, method, status: 'approved' } };
  }

  // Rejected / failed immediately
  await prisma.payment.update({
    where: { orderId },
    data: { status: 'FAILED' },
  });
  throw new AppError(400, 'Pagamento com cartão não aprovado. Verifique os dados e tente novamente.');
}

export async function handleOrderPaid(gatewayTxId: string, method?: 'PIX' | 'CREDIT_CARD') {
  const payment = await prisma.payment.findFirst({
    where: { gatewayTxId },
    include: { order: { include: { store: true } } },
  });

  if (!payment) {
    console.warn(`[payments] handleOrderPaid: no payment found for gatewayTxId ${gatewayTxId}`);
    return;
  }

  const order = payment.order;
  const stockOk = await confirmOrderWithStockDecrement(order.id);

  if (!stockOk) {
    const paymentMethod = method || payment.method;
    try {
      if (paymentMethod === 'PIX') {
        await efi.refundPix(gatewayTxId, Math.round(Number(order.totalAmount) * 100));
      } else {
        await efi.refundCard(gatewayTxId);
      }
    } catch (e) {
      console.error('[payments] Refund failed:', e);
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED', refundReason: 'Estoque insuficiente' },
      }),
      prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } }),
    ]);
  }
}

export async function handlePaymentFailed(gatewayTxId: string) {
  const payment = await prisma.payment.findFirst({
    where: { gatewayTxId },
    include: { order: true },
  });

  if (!payment) return;

  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });

  if (payment.order.status === 'PENDING') {
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'CANCELLED' } });
  }
}

export async function syncPaymentStatus(orderId: string, txid: string, user: UserPayload) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { id: true, buyerId: true },
  });

  if (order.buyerId !== user.id) throw new AppError(403, 'Acesso negado');

  const charge = await efi.getPixCharge(txid);

  if (charge.status === 'CONCLUIDA') {
    await handleOrderPaid(txid, 'PIX');
  }

  return {
    data: {
      txid: charge.txid,
      status: charge.status,
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
