'use client';

import { ApiError } from '@/lib/api-client';

// Efí Bank JS SDK loaded via CDN
// SDK docs: https://dev.efipay.com.br/docs/pagamentos/cartao
// CDN URL: https://js.efipay.com.br/v1/js (or legacy https://js.gerencianet.com.br/v1)
const EFI_SDK_URL = 'https://js.efipay.com.br/v1/js';

declare global {
  interface Window {
    EfipayJs?: {
      setAccount: (payeeCode: string) => void;
      getPaymentToken: (cardData: {
        brand: string;
        number: string;
        cvv: string;
        expiration_month: string;
        expiration_year: string;
        reuse: boolean;
      }) => Promise<{ payment_token: string; card_mask: string }>;
    };
  }
}

function detectBrand(cardNumber: string): string {
  const number = cardNumber.replace(/\s/g, '');
  if (/^4/.test(number)) return 'visa';
  if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) return 'mastercard';
  if (/^3[47]/.test(number)) return 'amex';
  if (/^6(?:011|5)/.test(number)) return 'discover';
  if (/^(?:636368|438935|504175|451416|636297)/.test(number)) return 'elo';
  if (/^(?:384100|384140|384160)/.test(number)) return 'hipercard';
  return 'visa'; // default fallback
}

async function loadEfipayJs(): Promise<void> {
  if (window.EfipayJs) return;

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${EFI_SDK_URL}"]`);
    if (existing) {
      // Script already loading — wait for it
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar SDK Efí')));
      return;
    }

    const script = document.createElement('script');
    script.src = EFI_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar SDK Efí'));
    document.head.appendChild(script);
  });
}

export async function getCardHash(cardData: {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
}): Promise<string> {
  const payeeCode = process.env.NEXT_PUBLIC_EFI_PAYEE_CODE;
  if (!payeeCode) {
    throw new ApiError(500, 'NEXT_PUBLIC_EFI_PAYEE_CODE não configurado');
  }

  await loadEfipayJs();

  if (!window.EfipayJs) {
    throw new ApiError(500, 'SDK Efí não carregou corretamente');
  }

  window.EfipayJs.setAccount(payeeCode);

  const result = await window.EfipayJs.getPaymentToken({
    brand: detectBrand(cardData.cardNumber),
    number: cardData.cardNumber.replace(/\s/g, ''),
    cvv: cardData.securityCode,
    expiration_month: cardData.expirationMonth,
    expiration_year: cardData.expirationYear,
    reuse: false,
  });

  if (!result?.payment_token) {
    throw new ApiError(400, 'Falha ao tokenizar cartão com Efí');
  }

  return result.payment_token;
}
