import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useOrder } from '../../hooks/useOrders';
import { useInitiatePayment } from '../../hooks/usePayment';
import { usePaymentByOrder } from '../../hooks/usePayment';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { Button } from '../../components/common/Button';
import { CreditCardForm } from '../../components/payment/credit-card-form';
import type { CardFormData } from '../../components/payment/credit-card-form';
import { createCardToken } from '../../services/mercadopago.service';
import { Colors } from '../../constants/colors';
import type { BuyerStackParamList } from '../../types/navigation.types';
import type { InitiatePaymentResponse } from '../../types/models.types';

type RouteProps = RouteProp<BuyerStackParamList, 'Checkout'>;
type Nav = NativeStackNavigationProp<BuyerStackParamList>;

const PIX_EXPIRATION_SECONDS = 15 * 60; // 15 minutes

export function CheckoutScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<Nav>();
  const { orderId } = route.params;
  const { data: order, isLoading, isError, refetch } = useOrder(orderId);
  const initiatePayment = useInitiatePayment();
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [method, setMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [pixData, setPixData] = useState<InitiatePaymentResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(PIX_EXPIRATION_SECONDS);
  const [copied, setCopied] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);

  const { data: payment } = usePaymentByOrder(orderId, paymentStarted);

  // Redirect when paid
  useEffect(() => {
    if (payment?.status === 'PAID' && order) {
      navigation.replace('OrderConfirm', { orderId, code: order.code });
    }
    if (payment?.status === 'FAILED' && paymentStarted) {
      Alert.alert(
        'Pagamento recusado',
        'O pagamento foi recusado. Verifique os dados e tente novamente.',
        [{ text: 'OK', onPress: () => setPaymentStarted(false) }],
      );
    }
  }, [payment?.status, order, orderId, navigation, paymentStarted]);

  // Pix countdown timer
  useEffect(() => {
    if (!paymentStarted || method !== 'PIX') return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          Alert.alert('Pix expirado', 'O tempo para pagamento via Pix expirou.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentStarted, method, navigation]);

  const handleCopyPixCode = useCallback(async () => {
    if (!pixData?.pixQrCode) return;
    await Clipboard.setStringAsync(pixData.pixQrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pixData?.pixQrCode]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (!order) return <ErrorState message="Pedido nao encontrado" />;

  const handlePay = () => {
    if (method === 'CREDIT_CARD') return; // handled by handleCardSubmit
    initiatePayment.mutate(
      { orderId, method },
      {
        onSuccess: (data) => {
          setPaymentStarted(true);
          if (method === 'PIX' && data) {
            setPixData(data);
          }
        },
        onError: () => Alert.alert('Erro', 'Falha ao iniciar pagamento'),
      },
    );
  };

  const handleCardSubmit = async (cardData: CardFormData) => {
    setCardLoading(true);
    try {
      const cardToken = await createCardToken(cardData);
      initiatePayment.mutate(
        { orderId, method: 'CREDIT_CARD', cardToken },
        {
          onSuccess: () => setPaymentStarted(true),
          onError: (error: any) => {
            const msg =
              error?.response?.data?.message ||
              'Falha ao processar pagamento com cartao';
            Alert.alert('Pagamento recusado', msg);
          },
        },
      );
    } catch {
      Alert.alert('Erro', 'Dados do cartao invalidos. Verifique e tente novamente.');
    } finally {
      setCardLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Pagamento</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.summaryCard}>
          <Text style={styles.label}>Pedido #{order.code}</Text>
          <Text style={styles.total}>R$ {Number(order.totalAmount).toFixed(2)}</Text>
          <Text style={styles.itemCount}>{order.items.length} item(ns)</Text>
        </View>

        {!paymentStarted ? (
          <>
            <Text style={styles.sectionTitle}>Metodo de pagamento</Text>

            <TouchableOpacity
              style={[styles.methodCard, method === 'PIX' && styles.methodActive]}
              onPress={() => setMethod('PIX')}
            >
              <Ionicons name="qr-code-outline" size={24} color={method === 'PIX' ? Colors.primary : Colors.textSecondary} />
              <View style={styles.methodInfo}>
                <Text style={[styles.methodName, method === 'PIX' && styles.methodNameActive]}>Pix</Text>
                <Text style={styles.methodDesc}>Pagamento instantaneo</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodCard, method === 'CREDIT_CARD' && styles.methodActive]}
              onPress={() => setMethod('CREDIT_CARD')}
            >
              <Ionicons name="card-outline" size={24} color={method === 'CREDIT_CARD' ? Colors.primary : Colors.textSecondary} />
              <View style={styles.methodInfo}>
                <Text style={[styles.methodName, method === 'CREDIT_CARD' && styles.methodNameActive]}>Cartao de credito</Text>
                <Text style={styles.methodDesc}>Debito na fatura</Text>
              </View>
            </TouchableOpacity>

            {method === 'CREDIT_CARD' ? (
              <CreditCardForm
                onSubmit={handleCardSubmit}
                loading={cardLoading || initiatePayment.isPending}
              />
            ) : (
              <Button
                title="Pagar"
                onPress={handlePay}
                loading={initiatePayment.isPending}
                style={{ marginTop: 24 }}
              />
            )}
          </>
        ) : method === 'PIX' && pixData?.pixQrCode ? (
          <View style={styles.pixCard}>
            <Text style={styles.pixTitle}>Escaneie o QR Code</Text>

            <View style={styles.timerRow}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.timerText}>Expira em {formatTime(secondsLeft)}</Text>
            </View>

            <View style={styles.qrContainer}>
              <QRCode value={pixData.pixQrCode} size={220} />
            </View>

            <Text style={styles.pixLabel}>Ou copie o codigo Pix:</Text>

            <TouchableOpacity style={styles.copyRow} onPress={handleCopyPixCode}>
              <Text style={styles.pixCode} numberOfLines={2}>
                {pixData.pixQrCode}
              </Text>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={22}
                color={copied ? '#22c55e' : Colors.primary}
              />
            </TouchableOpacity>

            {copied && (
              <Text style={styles.copiedText}>Copiado!</Text>
            )}

            <View style={styles.pixInstructions}>
              <Text style={styles.instructionText}>
                1. Abra o app do seu banco{'\n'}
                2. Escolha pagar com Pix{'\n'}
                3. Escaneie o QR Code ou cole o codigo
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.waitingCard}>
            <Ionicons name="time-outline" size={48} color={Colors.primary} />
            <Text style={styles.waitingTitle}>Aguardando pagamento...</Text>
            <Text style={styles.waitingDesc}>
              Processando pagamento no cartao
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  total: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  itemCount: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 12,
    gap: 16,
  },
  methodActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF7ED',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  methodNameActive: {
    color: Colors.primary,
  },
  methodDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pixCard: {
    alignItems: 'center',
    gap: 12,
  },
  pixTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginVertical: 8,
  },
  pixLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    width: '100%',
  },
  pixCode: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  copiedText: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '600',
  },
  pixInstructions: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 8,
  },
  instructionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  waitingCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  waitingDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
