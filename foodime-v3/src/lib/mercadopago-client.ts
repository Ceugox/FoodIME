'use client';

import { loadMercadoPago } from '@mercadopago/sdk-js';
import { ApiError } from '@/lib/api-client';

export interface CardTokenData {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  identificationNumber: string;
}

interface CardTokenResponse {
  id: string;
  message?: string;
  error?: string;
  cause?: Array<{ description?: string }>;
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => {
      createCardToken: (params: {
        cardNumber: string;
        cardholderName: string;
        cardExpirationMonth: string;
        cardExpirationYear: string;
        securityCode: string;
        identificationType: string;
        identificationNumber: string;
      }) => Promise<CardTokenResponse>;
    };
  }
}

export async function createCardToken(cardData: CardTokenData): Promise<string> {
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;

  if (!publicKey) {
    throw new ApiError(500, 'Chave pública do Mercado Pago não configurada');
  }

  await loadMercadoPago();

  if (!window.MercadoPago) {
    throw new ApiError(500, 'SDK do Mercado Pago não carregou corretamente');
  }

  const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
  const payload = await mp.createCardToken({
    cardNumber: cardData.cardNumber,
    cardholderName: cardData.cardholderName,
    cardExpirationMonth: cardData.expirationMonth,
    cardExpirationYear: `20${cardData.expirationYear}`,
    securityCode: cardData.securityCode,
    identificationType: 'CPF',
    identificationNumber: cardData.identificationNumber,
  });

  if (!payload.id) {
    const causeMessage = payload.cause?.find((item) => item.description)?.description;
    throw new ApiError(400, causeMessage || payload.message || payload.error || 'Falha ao tokenizar cartão');
  }

  return payload.id;
}
