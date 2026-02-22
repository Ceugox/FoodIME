import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

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

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

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

  const handleSubmit = () => {
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
    <View style={styles.container}>
      <Input
        label="Numero do cartao"
        value={cardNumber}
        onChangeText={(text) => setCardNumber(maskCardNumber(text))}
        placeholder="0000 0000 0000 0000"
        keyboardType="numeric"
        maxLength={19}
        error={errors.cardNumber}
      />

      <Input
        label="Nome do titular"
        value={cardholderName}
        onChangeText={setCardholderName}
        placeholder="Como esta no cartao"
        autoCapitalize="characters"
        error={errors.cardholderName}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Input
            label="Validade"
            value={expiry}
            onChangeText={(text) => setExpiry(maskExpiry(text))}
            placeholder="MM/AA"
            keyboardType="numeric"
            maxLength={5}
            error={errors.expiry}
          />
        </View>
        <View style={styles.halfField}>
          <Input
            label="CVV"
            value={cvv}
            onChangeText={(text) => setCvv(text.replace(/\D/g, '').slice(0, 4))}
            placeholder="123"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            error={errors.cvv}
          />
        </View>
      </View>

      <Input
        label="CPF do titular"
        value={cpf}
        onChangeText={(text) => setCpf(maskCpf(text))}
        placeholder="000.000.000-00"
        keyboardType="numeric"
        maxLength={14}
        error={errors.cpf}
      />

      <Button
        title="Pagar com cartao"
        onPress={handleSubmit}
        loading={loading}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  button: {
    marginTop: 8,
  },
});
