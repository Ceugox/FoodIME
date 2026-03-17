import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoService } from './mercadopago.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import type { UserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadopago: MercadoPagoService,
    private readonly notifications: NotificationsGateway,
  ) {}

  async initiatePayment(
    orderId: string,
    method: 'PIX' | 'CREDIT_CARD',
    user: UserPayload,
    cardToken?: string,
  ) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { store: true, buyer: { select: { email: true } } },
    });

    if (order.buyerId !== user.id) {
      throw new BadRequestException('Você não é o comprador deste pedido');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Pedido não está pendente');
    }

    // 2.10 Duplicate payment prevention
    await this.checkDuplicatePayment(orderId);

    const amountInCents = Math.round(Number(order.totalAmount) * 100);
    const commissionPercent = Number(order.store.commissionRate) * 100;

    let gatewayTxId: string;
    let pixQrCode: string | null = null;
    let pixQrCodeBase64: string | null = null;

    if (method === 'PIX') {
      const result = await this.mercadopago.createPixPayment({
        amount: amountInCents,
        orderId,
        payerEmail: order.buyer.email,
      });
      gatewayTxId = result.id;
      pixQrCode = result.pixQrCode;
      pixQrCodeBase64 = result.pixQrCodeBase64;
    } else {
      if (!cardToken) {
        throw new BadRequestException('cardToken obrigatório para cartão de crédito');
      }
      const result = await this.mercadopago.createCardPayment({
        amount: amountInCents,
        orderId,
        cardToken,
        payerEmail: order.buyer.email,
      });
      gatewayTxId = result.id;

      // 2.3 Card payments may be approved immediately (e.g. test card APRO)
      if (result.status === 'approved') {
        const commissionVal = (Number(order.totalAmount) * commissionPercent) / 100;
        const netVal = Number(order.totalAmount) - commissionVal;

        // Create payment record, then confirm order atomically
        try {
          await this.prisma.payment.create({
            data: {
              orderId,
              method,
              gatewayTxId,
              grossAmount: order.totalAmount,
              commission: commissionVal,
              netAmount: netVal,
              status: 'PROCESSING',
            },
          });
        } catch (error) {
          if (error.code === 'P2002') {
            throw new ConflictException('Já existe um pagamento para este pedido');
          }
          throw error;
        }

        // Confirm with atomic stock decrement; if stock fails, refund via MP
        const stockOk = await this.confirmOrderWithStockDecrement(orderId);

        if (!stockOk) {
          // Stock failed — refund the card payment via MP API
          try {
            await this.mercadopago.refundPayment(gatewayTxId);
          } catch (refundErr) {
            this.logger.error(
              `Failed to refund card payment ${gatewayTxId} after stock failure: ${refundErr.message}`,
            );
          }

          await this.prisma.$transaction([
            this.prisma.payment.update({
              where: { orderId },
              data: {
                status: 'REFUNDED',
                refundReason: 'Estoque insuficiente no momento da confirmação',
              },
            }),
            this.prisma.order.update({
              where: { id: orderId },
              data: { status: 'CANCELLED' },
            }),
          ]);

          throw new BadRequestException(
            'Estoque insuficiente. Pagamento estornado automaticamente.',
          );
        }

        return {
          data: { gatewayTxId, method },
        };
      }

      // Card payment rejected immediately
      if (result.status === 'rejected') {
        throw new BadRequestException(
          this.getCardRejectionMessage(result.statusDetail),
        );
      }
    }

    const commission = (Number(order.totalAmount) * commissionPercent) / 100;
    const netAmount = Number(order.totalAmount) - commission;

    try {
      await this.prisma.payment.create({
        data: {
          orderId,
          method,
          gatewayTxId,
          grossAmount: order.totalAmount,
          commission,
          netAmount,
          status: 'PROCESSING',
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Já existe um pagamento para este pedido');
      }
      throw error;
    }

    return {
      data: {
        gatewayTxId,
        method,
        ...(pixQrCode && { pixQrCode }),
        ...(pixQrCodeBase64 && { pixQrCodeBase64 }),
      },
    };
  }

  async handleOrderPaid(gatewayTxId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayTxId },
    });
    if (!payment) return;

    const stockOk = await this.confirmOrderWithStockDecrement(payment.orderId);

    if (!stockOk) {
      // Stock insufficient after webhook confirmation — refund via MP API
      try {
        await this.mercadopago.refundPayment(payment.gatewayTxId);
      } catch (refundErr) {
        this.logger.error(
          `Failed to refund payment ${payment.gatewayTxId} after stock failure: ${refundErr.message}`,
        );
      }

      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { orderId: payment.orderId },
          data: {
            status: 'REFUNDED',
            refundReason: 'Estoque insuficiente no momento da confirmação',
          },
        }),
        this.prisma.order.update({
          where: { id: payment.orderId },
          data: { status: 'CANCELLED' },
        }),
      ]);
    }
  }

  async handlePaymentFailed(gatewayTxId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayTxId },
    });
    if (!payment) return;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { orderId: payment.orderId },
        data: { status: 'FAILED' },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'CANCELLED' },
      }),
    ]);
  }

  /**
   * 2.1 Atomic stock decrement with Serializable isolation.
   * Returns true if order was confirmed, false if stock was insufficient.
   */
  private async confirmOrderWithStockDecrement(orderId: string): Promise<boolean> {
    let stockFailed = false;

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Re-read the order inside the serializable transaction
          const order = await tx.order.findUniqueOrThrow({
            where: { id: orderId },
            include: {
              items: { include: { product: true } },
              store: { select: { id: true, ownerId: true, name: true } },
              buyer: { select: { name: true } },
            },
          });

          // Idempotency guard: already confirmed
          if (order.status === 'PAID') {
            return { alreadyPaid: true, order };
          }

          // Atomically decrement stock using updateMany with WHERE stockQty >= quantity
          for (const item of order.items) {
            const updated = await tx.product.updateMany({
              where: {
                id: item.productId,
                stockQty: { gte: item.quantity },
              },
              data: {
                stockQty: { decrement: item.quantity },
              },
            });

            if (updated.count === 0) {
              // Stock insufficient — mark and throw to roll back the transaction
              stockFailed = true;
              throw new Error('STOCK_INSUFFICIENT');
            }
          }

          // Update payment and order status to PAID within the same transaction
          await tx.payment.update({
            where: { orderId },
            data: { status: 'PAID' },
          });

          await tx.order.update({
            where: { id: orderId },
            data: { status: 'PAID' },
          });

          return { alreadyPaid: false, order };
        },
        {
          isolationLevel: 'Serializable',
        },
      );

      // If already paid (idempotency), just return true
      if (result.alreadyPaid) {
        return true;
      }

      // Notify seller via Socket.io (outside the transaction)
      this.notifications.notifyNewOrder(result.order.store.ownerId, {
        id: result.order.id,
        code: (result.order as any).code,
        buyerName: result.order.buyer.name,
        totalAmount: Number(result.order.totalAmount),
        itemCount: result.order.items.length,
      });

      return true;
    } catch (error) {
      if (stockFailed) {
        this.logger.warn(`Stock insufficient for order ${orderId}, rolling back`);
        return false;
      }
      // Re-throw unexpected errors
      throw error;
    }
  }

  /**
   * 2.10 Duplicate payment prevention.
   * Throws ConflictException if a non-FAILED payment already exists for this order.
   */
  private async checkDuplicatePayment(orderId: string): Promise<void> {
    const existing = await this.prisma.payment.findFirst({
      where: {
        orderId,
        status: { not: 'FAILED' },
      },
    });

    if (existing) {
      throw new ConflictException('Já existe um pagamento ativo para este pedido');
    }
  }

  private getCardRejectionMessage(statusDetail?: string): string {
    const messages: Record<string, string> = {
      cc_rejected_insufficient_amount: 'Saldo insuficiente no cartão.',
      cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido.',
      cc_rejected_bad_filled_date: 'Data de validade inválida.',
      cc_rejected_bad_filled_other: 'Dados do cartão inválidos. Verifique e tente novamente.',
      cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
      cc_rejected_call_for_authorize: 'Você precisa autorizar o pagamento junto ao banco emissor.',
      cc_rejected_card_disabled: 'Cartão desabilitado. Entre em contato com o banco emissor.',
      cc_rejected_duplicated_payment: 'Pagamento duplicado. Já existe um pagamento com este valor.',
      cc_rejected_high_risk: 'Pagamento recusado por motivo de segurança.',
      cc_rejected_max_attempts: 'Número máximo de tentativas excedido. Use outro cartão.',
      cc_rejected_other_reason: 'Pagamento recusado pelo banco emissor.',
      cc_rejected_blacklist: 'Pagamento não processado.',
      cc_rejected_card_type_not_allowed: 'Este tipo de cartão não é aceito.',
      cc_rejected_invalid_installments: 'Número de parcelas inválido para este cartão.',
    };

    return messages[statusDetail ?? ''] ?? 'Pagamento recusado. Verifique os dados do cartão e tente novamente.';
  }

  async getPaymentByOrder(orderId: string, user: UserPayload) {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { orderId },
      include: {
        order: { select: { buyerId: true, store: { select: { ownerId: true } } } },
      },
    });

    const isBuyer = payment.order.buyerId === user.id;
    const isSeller = payment.order.store.ownerId === user.id;
    if (!isBuyer && !isSeller && user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso negado');
    }

    const { order: _, ...paymentData } = payment;
    return { data: paymentData };
  }
}
