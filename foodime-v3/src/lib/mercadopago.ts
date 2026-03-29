import { AppError } from '@/lib/api/errors';

const BASE_URL = 'https://api.mercadopago.com';

async function mpRequest<T>(method: string, path: string, data?: unknown, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.message || err.error || 'Erro MercadoPago';
    if (res.status === 400 || res.status === 422) throw new AppError(400, `MercadoPago: ${msg}`);
    if (res.status === 404) throw new AppError(404, `MercadoPago: ${msg}`);
    throw new AppError(500, `MercadoPago error: ${msg}`);
  }

  return res.json();
}

interface PixPaymentParams {
  amount: number; // in cents
  orderId: string;
  payerEmail: string;
}

interface CardPaymentParams {
  amount: number; // in cents
  orderId: string;
  cardToken: string;
  payerEmail: string;
}

interface CheckoutPreferenceParams {
  orderId: string;
  items: Array<{ title: string; quantity: number; unitPrice: number }>;
  returnUrl: string;
  notificationUrl?: string;
}

export async function createPixPayment(params: PixPaymentParams) {
  const response = await mpRequest<any>('POST', '/v1/payments', {
    transaction_amount: params.amount / 100,
    description: 'Pedido FoodIME',
    payment_method_id: 'pix',
    payer: { email: params.payerEmail },
    metadata: { order_id: params.orderId },
  }, params.orderId);

  return {
    id: String(response.id),
    status: response.status,
    pixQrCode: response.point_of_interaction?.transaction_data?.qr_code || '',
    pixQrCodeBase64: response.point_of_interaction?.transaction_data?.qr_code_base64 || '',
  };
}

export async function createCardPayment(params: CardPaymentParams) {
  const response = await mpRequest<any>('POST', '/v1/payments', {
    transaction_amount: params.amount / 100,
    description: 'Pedido FoodIME',
    token: params.cardToken,
    installments: 1,
    payer: { email: params.payerEmail },
    metadata: { order_id: params.orderId },
  }, params.orderId);

  return {
    id: String(response.id),
    status: response.status as string,
    statusDetail: response.status_detail as string | undefined,
  };
}

export async function createCheckoutPreference(params: CheckoutPreferenceParams) {
  const response = await mpRequest<any>('POST', '/checkout/preferences', {
    items: params.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      currency_id: 'BRL',
    })),
    external_reference: params.orderId,
    metadata: { order_id: params.orderId },
    back_urls: {
      success: params.returnUrl,
      failure: params.returnUrl,
      pending: params.returnUrl,
    },
    auto_return: 'approved',
    payment_methods: {
      excluded_payment_types: [
        { id: 'ticket' },
        { id: 'bank_transfer' },
        { id: 'atm' },
      ],
    },
    ...(params.notificationUrl ? { notification_url: params.notificationUrl } : {}),
  }, params.orderId);

  return {
    id: String(response.id),
    checkoutUrl: response.sandbox_init_point || response.init_point,
  };
}

export async function getPayment(paymentId: string) {
  return mpRequest<any>('GET', `/v1/payments/${paymentId}`);
}

export async function refundPayment(paymentId: string) {
  return mpRequest<any>('POST', `/v1/payments/${paymentId}/refunds`);
}
