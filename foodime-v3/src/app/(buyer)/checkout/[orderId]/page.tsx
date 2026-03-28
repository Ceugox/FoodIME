'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createCardToken } from '@/lib/mercadopago-client';
import { useOrder } from '@/hooks/useOrders';
import { useInitiatePayment, usePaymentByOrder } from '@/hooks/usePayment';
import { useCartStore } from '@/store/cartStore';
import { toast } from '@/components/common/toast';
import { PIX_EXPIRY_MINUTES } from '@/lib/constants';

type Tab = 'PIX' | 'CARD';

interface CardData {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
  cpf: string;
}

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const clear = useCartStore((s) => s.clear);
  const { data: order } = useOrder(orderId);
  const initiate = useInitiatePayment();

  const [tab, setTab] = useState<Tab>('PIX');
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string } | null>(null);
  const [pixExpiry, setPixExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('');
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [cardData, setCardData] = useState<CardData>({ number: '', name: '', expiry: '', cvv: '', cpf: '' });

  const isPaid = order?.status === 'PAID' || order?.status === 'READY' || order?.status === 'PICKED_UP';
  const shouldPoll = paymentStarted || isPaid;
  const { data: paymentData } = usePaymentByOrder(orderId, shouldPoll);

  // Redirect when paid
  useEffect(() => {
    if (isPaid) {
      clear();
      toast({ title: 'Pagamento confirmado!', variant: 'success' });
      setTimeout(() => router.push('/orders'), 1500);
    }
  }, [isPaid, clear, router]);

  // Countdown timer for PIX
  useEffect(() => {
    if (!pixExpiry) return;
    const interval = setInterval(() => {
      const diff = pixExpiry.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Expirado');
        clearInterval(interval);
        return;
      }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setCountdown(`${min}:${sec.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [pixExpiry]);

  const handlePixPayment = useCallback(async () => {
    try {
      const result = await initiate.mutateAsync({ orderId, method: 'PIX' });
      setPixData({
        qrCode: result.data.pixQrCode,
        qrCodeBase64: result.data.pixQrCodeBase64,
      });
      setPixExpiry(new Date(Date.now() + PIX_EXPIRY_MINUTES * 60 * 1000));
      setPaymentStarted(true);
    } catch (err: any) {
      toast({ title: err?.message || 'Erro ao gerar PIX', variant: 'error' });
    }
  }, [orderId, initiate]);

  const handleCardPayment = useCallback(async () => {
    const sanitizedNumber = cardData.number.replace(/\D/g, '');
    const sanitizedCpf = cardData.cpf.replace(/\D/g, '');
    const [expirationMonth = '', expirationYear = ''] = cardData.expiry.split('/');

    if (!sanitizedNumber || !cardData.name || !expirationMonth || !expirationYear || !cardData.cvv || sanitizedCpf.length !== 11) {
      toast({ title: 'Preencha todos os campos do cartão', variant: 'error' });
      return;
    }

    try {
      const cardToken = await createCardToken({
        cardNumber: sanitizedNumber,
        cardholderName: cardData.name,
        expirationMonth,
        expirationYear,
        securityCode: cardData.cvv,
        identificationNumber: sanitizedCpf,
      });

      await initiate.mutateAsync({ orderId, method: 'CREDIT_CARD', cardToken });
      setPaymentStarted(true);
      toast({ title: 'Pagamento enviado. Validando com o Mercado Pago...', variant: 'success' });
    } catch (err: any) {
      toast({ title: err?.message || 'Erro ao processar pagamento com cartão', variant: 'error' });
    }
  }, [cardData]);

  const copyPixCode = useCallback(async () => {
    if (!pixData?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      toast({ title: 'Código PIX copiado!', variant: 'success' });
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'error' });
    }
  }, [pixData]);

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isPaid) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="text-lg font-bold text-text">Pagamento confirmado!</p>
        <p className="text-text-muted text-sm">Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-serif text-text mb-1">Pagamento</h1>
      <p className="text-text-muted text-xs mb-6">Pedido #{order.code} — R$ {Number(order.totalAmount).toFixed(2)}</p>

      {/* Tab Selector */}
      <div className="flex gap-2 mb-6">
        {(['PIX', 'CARD'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            disabled={!!pixData}
            className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all ${
              tab === t ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'
            } ${pixData ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {t === 'PIX' ? 'PIX' : 'Cartão de Crédito'}
          </button>
        ))}
      </div>

      {/* PIX Tab */}
      {tab === 'PIX' && !pixData && (
        <div className="bg-surface rounded-2xl border border-border p-6 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <p className="text-text text-sm mb-1 font-semibold">Pague com PIX</p>
          <p className="text-text-muted text-xs mb-4">Escaneie o QR Code ou copie o código PIX</p>
          <button
            onClick={handlePixPayment}
            disabled={initiate.isPending}
            className="w-full h-12 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-60"
          >
            {initiate.isPending ? 'Gerando...' : 'Gerar QR Code PIX'}
          </button>
        </div>
      )}

      {/* PIX QR Code Display */}
      {tab === 'PIX' && pixData && (
        <div className="bg-surface rounded-2xl border border-border p-6 text-center">
          {/* Countdown */}
          <div className="mb-4">
            <p className="text-text-muted text-xs">Expira em</p>
            <p className={`text-lg font-bold ${countdown === 'Expirado' ? 'text-error' : 'text-accent'}`}>{countdown}</p>
          </div>

          {/* QR Code Image */}
          {pixData.qrCodeBase64 && (
            <div className="bg-white rounded-xl p-4 inline-block mb-4">
              <img
                src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-48 h-48"
              />
            </div>
          )}

          {/* Copy Code */}
          <button
            onClick={copyPixCode}
            className="w-full h-11 bg-surface-2 border border-border rounded-xl text-text text-sm font-semibold hover:bg-border/30 transition-colors mb-3"
          >
            Copiar código PIX
          </button>

          {/* Polling indicator */}
          <p className="text-text-muted text-xs flex items-center justify-center gap-1">
            Aguardando pagamento
            <span className="inline-flex gap-0.5">
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </p>
        </div>
      )}

      {/* Card Tab */}
      {tab === 'CARD' && (
        <div className="bg-surface rounded-2xl border border-border p-6">
          <div className="space-y-4">
            <div>
              <label className="text-text-secondary text-xs font-semibold mb-1 block">Número do cartão</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={19}
                placeholder="0000 0000 0000 0000"
                value={cardData.number}
                onChange={(e) => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim() })}
                className="w-full h-12 bg-background border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-text-secondary text-xs font-semibold mb-1 block">Nome no cartão</label>
              <input
                type="text"
                placeholder="NOME COMPLETO"
                value={cardData.name}
                onChange={(e) => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                className="w-full h-12 bg-background border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-text-secondary text-xs font-semibold mb-1 block">Validade</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="MM/AA"
                  value={cardData.expiry}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                    setCardData({ ...cardData, expiry: v });
                  }}
                  className="w-full h-12 bg-background border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-text-secondary text-xs font-semibold mb-1 block">CVV</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="123"
                  value={cardData.cvv}
                  onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                  className="w-full h-12 bg-background border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-text-secondary text-xs font-semibold mb-1 block">CPF do titular</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={14}
                placeholder="000.000.000-00"
                value={cardData.cpf}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                  const masked = digits
                    .replace(/^(\d{3})(\d)/, '$1.$2')
                    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
                    .replace(/\.(\d{3})(\d)/, '.$1-$2');
                  setCardData({ ...cardData, cpf: masked });
                }}
                className="w-full h-12 bg-background border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleCardPayment}
            disabled={initiate.isPending}
            className="w-full h-12 bg-primary text-white rounded-xl font-semibold text-sm mt-6 disabled:opacity-60"
          >
            {initiate.isPending ? 'Processando...' : `Pagar R$ ${Number(order.totalAmount).toFixed(2)}`}
          </button>
        </div>
      )}

      {/* Order Summary */}
      <div className="mt-6 bg-surface rounded-xl border border-border p-4">
        <p className="text-xs text-text-secondary font-semibold mb-2">Resumo do pedido</p>
        {order.items?.map((item: any) => (
          <div key={item.id} className="flex justify-between text-xs text-text py-1">
            <span>{item.quantity}x {item.product?.name || 'Produto'}</span>
            <span>R$ {(Number(item.priceAtPurchase) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-border mt-2 pt-2 flex justify-between">
          <span className="text-sm font-bold text-text">Total</span>
          <span className="text-sm font-bold text-primary">R$ {Number(order.totalAmount).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
