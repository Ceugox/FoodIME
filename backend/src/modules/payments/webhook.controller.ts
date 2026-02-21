import { Controller, Post, Body, Headers, Query, HttpCode } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { MercadoPagoService } from './mercadopago.service';

@Controller('payments')
export class WebhookController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly mercadopago: MercadoPagoService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Query('data.id') dataId: string,
    @Body() body: any,
  ) {
    // Validar assinatura do Mercado Pago
    if (signature && process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      const parts = signature.split(',').reduce(
        (acc, part) => {
          const [key, value] = part.split('=');
          acc[key.trim()] = value;
          return acc;
        },
        {} as Record<string, string>,
      );

      const ts = parts['ts'];
      const hash = parts['v1'];

      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const expectedHash = crypto
        .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
        .update(manifest)
        .digest('hex');

      if (hash !== expectedHash) {
        console.warn('Webhook com assinatura inválida recebido');
        return { received: true };
      }
    }

    const action = body.action;
    const paymentId = body.data?.id ? String(body.data.id) : null;

    if (!paymentId) {
      return { received: true };
    }

    if (action === 'payment.updated' || action === 'payment.created') {
      try {
        const mpPayment = await this.mercadopago.getPayment(paymentId);

        if (mpPayment.status === 'approved') {
          await this.paymentsService.handleOrderPaid(paymentId);
        } else if (
          mpPayment.status === 'rejected' ||
          mpPayment.status === 'cancelled'
        ) {
          await this.paymentsService.handlePaymentFailed(paymentId);
        }
      } catch (error) {
        console.error('Erro ao processar webhook MP:', error);
      }
    }

    return { received: true };
  }
}
