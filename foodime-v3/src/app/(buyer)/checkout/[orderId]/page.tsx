'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrder } from '@/hooks/useOrders';
import { useInitiatePayment } from '@/hooks/usePayment';
import { useCartStore } from '@/store/cartStore';
import { toast } from '@/components/common/toast';
import { PIX_EXPIRY_MINUTES } from '@/lib/constants';

type Tab = 'PIX' | 'CARD';

interface CardForm {
  number: string;
  name: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  cpf: string;
}

const EMPTY_CARD: CardForm = { number: '', name: '', expMonth: '', expYear: '', cvv: '', cpf: '' };

function formatCardNumber(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    .replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3')
    .replace(/(\d{3})(\d{0,3})/, '$1.$2');
}

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const clear = useCartStore((s) => s.clear);
  const initiate = useInitiatePayment();

  const [tab, setTab] = useState<Tab>('PIX');
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string } | null>(null);
  const [pixExpiry, setPixExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('');
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [cardForm, setCardForm] = useState<CardForm>(EMPTY_CARD);
  const [cardLoading, setCardLoading] = useState(false);

  const { data: order } = useOrder(orderId, paymentStarted ? 3000 : false);
  const isPaid = order?.status === 'PAID' || order?.status === 'READY' || order?.status === 'PICKED_UP';

  // Redirect when order is paid
  useEffect(() => {
    if (isPaid) {
      clear();
      toast({ title: 'Pagamento confirmado!', variant: 'success' });
      setTimeout(() => router.push('/orders'), 1500);
    }
  }, [isPaid, clear, router]);

  // PIX countdown
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
      const { pixCopiaECola, qrCodeBase64 } = result?.data ?? {};
      if (!pixCopiaECola) throw new Error('PIX indisponível — tente novamente');
      setPixData({ qrCode: pixCopiaECola, qrCodeBase64: qrCodeBase64 || '' });
      setPixExpiry(new Date(Date.now() + PIX_EXPIRY_MINUTES * 60 * 1000));
      setPaymentStarted(true);
    } catch (err: any) {
      toast({ title: err?.message || 'Erro ao gerar PIX', variant: 'error' });
    }
  }, [orderId, initiate]);

  const handleCardPayment = useCallback(async () => {
    if (!cardForm.number || !cardForm.name || !cardForm.expMonth || !cardForm.expYear || !cardForm.cvv || !cardForm.cpf) {
      toast({ title: 'Preencha todos os campos do cartão', variant: 'error' });
      return;
    }

    setCardLoading(true);
    try {
      // Dynamic import to avoid loading SDK unless needed
      const { getCardHash } = await import('@/lib/efibank-client');
      const cardHash = await getCardHash({
        cardNumber: cardForm.number,
        cardholderName: cardForm.name,
        expirationMonth: cardForm.expMonth,
        expirationYear: cardForm.expYear,
        securityCode: cardForm.cvv,
      });

      const result = await initiate.mutateAsync({ orderId, method: 'CREDIT_CARD', cardHash });
      const status = result?.data?.status;

      if (status === 'approved') {
        setPaymentStarted(true);
        toast({ title: 'Cartão aprovado! Confirmando pedido...', variant: 'success' });
      }
    } catch (err: any) {
      toast({ title: err?.message || 'Pagamento com cartão recusado', variant: 'error' });
    } finally {
      setCardLoading(false);
    }
  }, [cardForm, orderId, initiate]);

  const copyPixCode = useCallback(async () => {
    if (!pixData?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      toast({ title: 'Código PIX copiado!', variant: 'success' });
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'error' });
    }
  }, [pixData]);

  const setField = (field: keyof CardForm, value: string) =>
    setCardForm((prev) => ({ ...prev, [field]: value }));

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
          <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
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

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {(['PIX', 'CARD'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            disabled={!!pixData || paymentStarted}
            className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all ${
              tab === t ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'
            } ${pixData || paymentStarted ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {t === 'PIX' ? 'PIX' : 'Cartão de Crédito'}
          </button>
        ))}
      </div>

      {/* PIX — before generating */}
      {tab === 'PIX' && !pixData && (
        <div className="bg-surface rounded-2xl border border-border p-6 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
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

      {/* PIX — QR code shown */}
      {tab === 'PIX' && pixData && (
        <div className="bg-surface rounded-2xl border border-border p-6 text-center">
          <div className="mb-4">
            <p className="text-text-muted text-xs">Expira em</p>
            <p className={`text-lg font-bold ${countdown === 'Expirado' ? 'text-error' : 'text-accent'}`}>{countdown}</p>
          </div>

          {pixData.qrCodeBase64 && (
            <div className="bg-white rounded-xl p-4 inline-block mb-4">
              <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code PIX" className="w-48 h-48" />
            </div>
          )}

          <button
            onClick={copyPixCode}
            className="w-full h-11 bg-surface-2 border border-border rounded-xl text-text text-sm font-semibold hover:bg-border/30 transition-colors mb-3"
          >
            Copiar código PIX
          </button>

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

      {/* Card form */}
      {tab === 'CARD' && (
        <div className="bg-surface rounded-2xl border border-border p-6">
          <p className="text-sm font-semibold text-text mb-4">Dados do cartão</p>

          <div className="space-y-3">
            {/* Card number */}
            <div>
              <label className="text-xs text-text-muted mb-1 block">Número do cartão</label>
              <input
                type="text"
                inputMode="numeric"
                value={cardForm.number}
                onChange={(e) => setField('number', formatCardNumber(e.target.value))}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
            </div>

            {/* Cardholder name */}
            <div>
              <label className="text-xs text-text-muted mb-1 block">Nome no cartão</label>
              <input
                type="text"
                value={cardForm.name}
                onChange={(e) => setField('name', e.target.value.toUpperCase())}
                placeholder="NOME COMO NO CARTÃO"
                className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
            </div>

            {/* Expiry + CVV */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-text-muted mb-1 block">Mês</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardForm.expMonth}
                  onChange={(e) => setField('expMonth', e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="MM"
                  maxLength={2}
                  className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-text-muted mb-1 block">Ano</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardForm.expYear}
                  onChange={(e) => setField('expYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="AAAA"
                  maxLength={4}
                  className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-text-muted mb-1 block">CVV</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardForm.cvv}
                  onChange={(e) => setField('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  maxLength={4}
                  className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* CPF */}
            <div>
              <label className="text-xs text-text-muted mb-1 block">CPF do titular</label>
              <input
                type="text"
                inputMode="numeric"
                value={cardForm.cpf}
                onChange={(e) => setField('cpf', formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            onClick={handleCardPayment}
            disabled={cardLoading || initiate.isPending}
            className="w-full h-12 bg-primary text-white rounded-xl font-semibold text-sm mt-6 disabled:opacity-60"
          >
            {cardLoading || initiate.isPending ? 'Processando...' : 'Pagar com cartão'}
          </button>
        </div>
      )}

      {/* Order summary */}
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
