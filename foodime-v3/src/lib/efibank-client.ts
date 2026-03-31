'use client';

import { ApiError } from '@/lib/api-client';

// Efí Bank JS SDK — payment-token-efi (npm package, served via jsDelivr CDN)
// https://github.com/efipay/js-payment-token-efi
const EFI_SDK_URL = 'https://cdn.jsdelivr.net/npm/payment-token-efi/dist/payment-token-efi-umd.min.js';
const EFI_ENVIRONMENT = process.env.NEXT_PUBLIC_EFI_SANDBOX === 'true' ? 'sandbox' : 'production';

interface EfiCreditCard {
  setAccount: (payeeCode: string) => EfiCreditCard;
  setEnvironment: (env: 'production' | 'sandbox') => EfiCreditCard;
  setCreditCardData: (data: {
    brand: string;
    number: string;
    cvv: string;
    expirationMonth: string;
    expirationYear: string;
    holderName: string;
    holderDocument?: string;
  }) => EfiCreditCard;
  getPaymentToken: () => Promise<{ payment_token: string; card_mask: string }>;
  setCardNumber: (number: string) => EfiCreditCard;
  verifyCardBrand: () => Promise<{ brand: string }>;
}

declare global {
  interface Window {
    EfiPay?: {
      CreditCard: EfiCreditCard;
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

async function loadEfiPaySdk(): Promise<void> {
  if (window.EfiPay) return;

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${EFI_SDK_URL}"]`);
    if (existing) {
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
  holderDocument?: string;
}): Promise<string> {
  // NEXT_PUBLIC_EFI_ACCOUNT_ID = "Identificador de Conta" found at
  // Efí Bank panel → API → Introdução → Identificador de conta
  const accountId = process.env.NEXT_PUBLIC_EFI_ACCOUNT_ID || process.env.NEXT_PUBLIC_EFI_PAYEE_CODE;
  if (!accountId) {
    throw new ApiError(500, 'NEXT_PUBLIC_EFI_ACCOUNT_ID não configurado');
  }

  await loadEfiPaySdk();

  if (!window.EfiPay) {
    throw new ApiError(500, 'SDK Efí não carregou corretamente');
  }

  const result = await window.EfiPay.CreditCard
    .setAccount(accountId)
    .setEnvironment(EFI_ENVIRONMENT as 'production' | 'sandbox')
    .setCreditCardData({
      brand: detectBrand(cardData.cardNumber),
      number: cardData.cardNumber.replace(/\s/g, ''),
      cvv: cardData.securityCode,
      expirationMonth: cardData.expirationMonth,
      expirationYear: cardData.expirationYear,
      holderName: cardData.cardholderName,
      holderDocument: cardData.holderDocument,
    })
    .getPaymentToken();

  if (!result?.payment_token) {
    throw new ApiError(400, 'Falha ao tokenizar cartão com Efí');
  }

  return result.payment_token;
}
