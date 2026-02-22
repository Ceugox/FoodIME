import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoService } from './mercadopago.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import type { UserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class PaymentsService {
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

    const amountInCents = Math.round(Number(order.totalAmount) * 100);
    const commissionPercent = Number(order.store.commissionRate) * 100;

    let gatewayTxId: string;
    let pixQrCode: string | null = null;
    let pixQrCodeBase64: string | null = null;

    if (method === 'PIX') {
      const result = await this.mercadopago.createPixPayment({
        amount: amountInCents,
        orderId,
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

      // Card payments may be approved immediately (e.g. test card APRO)
      if (result.status === 'approved') {
        const commissionVal = (Number(order.totalAmount) * commissionPercent) / 100;
        const netVal = Number(order.totalAmount) - commissionVal;

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

        // Confirm immediately since MP already approved
        await this.confirmOrderWithStockDecrement(orderId);

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

    await this.confirmOrderWithStockDecrement(payment.orderId);
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

  private async confirmOrderWithStockDecrement(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        store: { select: { id: true, ownerId: true, name: true } },
        buyer: { select: { name: true } },
      },
    });

    // Verificar estoque antes de confirmar
    for (const item of order.items) {
      if (item.product.stockQty < item.quantity) {
        // Estoque insuficiente — estornar e cancelar
        const payment = await this.prisma.payment.findUniqueOrThrow({
          where: { orderId },
        });
        await this.mercadopago.refundPayment(payment.gatewayTxId);

        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { orderId },
            data: { status: 'REFUNDED' },
          }),
          this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' },
          }),
        ]);
        return;
      }
    }

    // Decrementar estoque atomicamente e confirmar pedido
    await this.prisma.$transaction([
      ...order.items.map((item) =>
        this.prisma.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.quantity } },
        }),
      ),
      this.prisma.payment.update({
        where: { orderId },
        data: { status: 'PAID' },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      }),
    ]);

    // Notificar vendedor via Socket.io
    this.notifications.notifyNewOrder(order.store.ownerId, {
      id: order.id,
      code: (order as any).code,
      buyerName: order.buyer.name,
      totalAmount: Number(order.totalAmount),
      itemCount: order.items.length,
    });
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

  async getPaymentByOrder(orderId: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { orderId },
    });

    return { data: payment };
  }
}
