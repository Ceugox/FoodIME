import axios from 'axios';

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;

export interface CardData {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  identificationType: string;
  identificationNumber: string;
}

interface CardTokenResponse {
  id: string;
}

export async function createCardToken(cardData: CardData): Promise<string> {
  const response = await axios.post<CardTokenResponse>(
    `https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`,
    {
      card_number: cardData.cardNumber,
      cardholder: {
        name: cardData.cardholderName,
        identification: {
          type: cardData.identificationType,
          number: cardData.identificationNumber,
        },
      },
      expiration_month: Number(cardData.expirationMonth),
      expiration_year: Number(`20${cardData.expirationYear}`),
      security_code: cardData.securityCode,
    },
  );

  return response.data.id;
}
