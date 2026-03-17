'use client';
import { useState } from 'react';

export interface CardFormData {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  identificationType: string;
  identificationNumber: string;
}

interface CreditCardFormProps {
  onSubmit: (data: CardFormData) => void;
  loading: boolean;
}

function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function maskExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

function luhnCheck(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

const inputClass =
  'w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-sm transition-all';

export function CreditCardForm({ onSubmit, loading }: CreditCardFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cpf, setCpf] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const digits = cardNumber.replace(/\D/g, '');

    if (digits.length < 13 || digits.length > 16) {
      newErrors.cardNumber = 'Numero do cartao invalido';
    } else if (!luhnCheck(digits)) {
      newErrors.cardNumber = 'Numero do cartao invalido';
    }
    if (cardholderName.trim().length < 3) {
      newErrors.cardholderName = 'Nome do titular obrigatorio';
    }
    const expiryDigits = expiry.replace(/\D/g, '');
    if (expiryDigits.length !== 4) {
      newErrors.expiry = 'Validade invalida (MM/AA)';
    } else {
      const month = Number(expiryDigits.slice(0, 2));
      if (month < 1 || month > 12) {
        newErrors.expiry = 'Mes invalido';
      }
    }
    if (cvv.length < 3 || cvv.length > 4) {
      newErrors.cvv = 'CVV invalido';
    }
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      newErrors.cpf = 'CPF invalido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const expiryDigits = expiry.replace(/\D/g, '');

    onSubmit({
      cardNumber: cardNumber.replace(/\D/g, ''),
      cardholderName: cardholderName.trim().toUpperCase(),
      expirationMonth: expiryDigits.slice(0, 2),
      expirationYear: expiryDigits.slice(2, 4),
      securityCode: cvv,
      identificationType: 'CPF',
      identificationNumber: cpf.replace(/\D/g, ''),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-2">
      <div>
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
          Numero do cartao
        </label>
        <input
          type="text"
          inputMode="numeric"
          className={inputClass}
          placeholder="0000 0000 0000 0000"
          maxLength={19}
          value={cardNumber}
          onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
        />
        {errors.cardNumber && <p className="text-error text-xs mt-1">{errors.cardNumber}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
          Nome do titular
        </label>
        <input
          type="text"
          className={`${inputClass} uppercase`}
          placeholder="Como esta no cartao"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
        />
        {errors.cardholderName && <p className="text-error text-xs mt-1">{errors.cardholderName}</p>}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
            Validade
          </label>
          <input
            type="text"
            inputMode="numeric"
            className={inputClass}
            placeholder="MM/AA"
            maxLength={5}
            value={expiry}
            onChange={(e) => setExpiry(maskExpiry(e.target.value))}
          />
          {errors.expiry && <p className="text-error text-xs mt-1">{errors.expiry}</p>}
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
            CVV
          </label>
          <input
            type="password"
            inputMode="numeric"
            className={inputClass}
            placeholder="123"
            maxLength={4}
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          {errors.cvv && <p className="text-error text-xs mt-1">{errors.cvv}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
          CPF do titular
        </label>
        <input
          type="text"
          inputMode="numeric"
          className={inputClass}
          placeholder="000.000.000-00"
          maxLength={14}
          value={cpf}
          onChange={(e) => setCpf(maskCpf(e.target.value))}
        />
        {errors.cpf && <p className="text-error text-xs mt-1">{errors.cpf}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold shadow-warm hover:shadow-glow transition-all mt-1"
      >
        {loading ? 'Processando...' : 'Pagar com cartao'}
      </button>
    </form>
  );
}
