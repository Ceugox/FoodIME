import { Controller, Post, Body, Headers, Query, HttpCode, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { MercadoPagoService } from './mercadopago.service';

const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutos

@Controller('payments')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly processedRequestIds = new Set<string>();

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly mercadopago: MercadoPagoService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async handleWebhook(
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Query('data.id') dataId: string,
    @Body() body: any,
  ) {
    // Deduplicação por request-id
    if (requestId && this.processedRequestIds.has(requestId)) {
      this.logger.warn(`Webhook duplicado ignorado: ${requestId}`);
      return { received: true };
    }

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

      // Validar timestamp (proteção contra replay > 5 min)
      const tsNum = Number(ts);
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (Math.abs(nowSeconds - tsNum) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
        this.logger.warn(`Webhook com timestamp expirado: ${ts}`);
        return { received: true };
      }

      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const expectedHash = crypto
        .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
        .update(manifest)
        .digest('hex');

      if (hash !== expectedHash) {
        this.logger.warn('Webhook com assinatura inválida recebido');
        return { received: true };
      }
    }

    // Marcar request-id como processado (TTL de 10 min)
    if (requestId) {
      this.processedRequestIds.add(requestId);
      setTimeout(
        () => this.processedRequestIds.delete(requestId),
        10 * 60 * 1000,
      );
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
        this.logger.error('Erro ao processar webhook MP:', error);
      }
    }

    return { received: true };
  }
}
