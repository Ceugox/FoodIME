import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

interface PixPaymentParams {
  amount: number;
  orderId: string;
  description?: string;
}

interface CardPaymentParams {
  amount: number;
  orderId: string;
  cardToken: string;
  installments?: number;
  description?: string;
  payerEmail: string;
}

@Injectable()
export class MercadoPagoService {
  private readonly baseUrl = 'https://api.mercadopago.com';

  private get headers() {
    return {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': undefined as string | undefined,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    data?: any,
    idempotencyKey?: string,
  ): Promise<T> {
    try {
      const headers = this.headers;
      if (idempotencyKey) {
        headers['X-Idempotency-Key'] = idempotencyKey;
      } else {
        delete headers['X-Idempotency-Key'];
      }

      const response = await axios({
        method,
        url: `${this.baseUrl}${path}`,
        headers,
        data,
      });
      return response.data;
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;
      throw new InternalServerErrorException(`MercadoPago error: ${msg}`);
    }
  }

  async createPixPayment(params: PixPaymentParams) {
    const response = await this.request<any>(
      'POST',
      '/v1/payments',
      {
        transaction_amount: params.amount / 100, // MP expects BRL (not cents)
        description: params.description || 'Pedido FoodIME',
        payment_method_id: 'pix',
        payer: { email: 'cliente@foodime.com' },
        metadata: { order_id: params.orderId },
      },
      params.orderId,
    );

    return {
      id: String(response.id),
      status: response.status,
      pixQrCode:
        response.point_of_interaction?.transaction_data?.qr_code || '',
      pixQrCodeBase64:
        response.point_of_interaction?.transaction_data?.qr_code_base64 || '',
    };
  }

  async createCardPayment(params: CardPaymentParams) {
    const response = await this.request<any>(
      'POST',
      '/v1/payments',
      {
        transaction_amount: params.amount / 100,
        description: params.description || 'Pedido FoodIME',
        token: params.cardToken,
        installments: params.installments ?? 1,
        payer: { email: params.payerEmail },
        metadata: { order_id: params.orderId },
      },
      params.orderId,
    );

    return {
      id: String(response.id),
      status: response.status as string,
      statusDetail: response.status_detail as string | undefined,
    };
  }

  async getPayment(paymentId: string) {
    return this.request<any>('GET', `/v1/payments/${paymentId}`);
  }

  async refundPayment(paymentId: string) {
    return this.request<any>('POST', `/v1/payments/${paymentId}/refunds`);
  }
}
