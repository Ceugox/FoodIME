'use client';

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

export async function createCardToken(cardData: CardTokenData): Promise<string> {
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;

  if (!publicKey) {
    throw new ApiError(500, 'Chave pública do Mercado Pago não configurada');
  }

  const response = await fetch(
    `https://api.mercadopago.com/v1/card_tokens?public_key=${publicKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_number: cardData.cardNumber,
        cardholder: {
          name: cardData.cardholderName,
          identification: {
            type: 'CPF',
            number: cardData.identificationNumber,
          },
        },
        expiration_month: Number(cardData.expirationMonth),
        expiration_year: Number(`20${cardData.expirationYear}`),
        security_code: cardData.securityCode,
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as CardTokenResponse;

  if (!response.ok || !payload.id) {
    const causeMessage = payload.cause?.find((item) => item.description)?.description;
    throw new ApiError(400, causeMessage || payload.message || payload.error || 'Falha ao tokenizar cartão');
  }

  return payload.id;
}
