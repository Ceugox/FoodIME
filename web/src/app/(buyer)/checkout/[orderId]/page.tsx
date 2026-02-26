'use client';
import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useOrder } from '@/hooks/useOrders';
import { useInitiatePayment, usePaymentByOrder } from '@/hooks/usePayment';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils';
import { CreditCardForm, type CardFormData } from '@/components/payment/credit-card-form';
import { createCardToken } from '@/services/mercadopago.service';
import { toast } from '@/hooks/useToast';

const PIX_EXPIRY_SECONDS = 15 * 60;

function CountdownTimer({ startedAt }: { startedAt: number }) {
  const [remaining, setRemaining] = useState(PIX_EXPIRY_SECONDS - Math.floor((Date.now() - startedAt) / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const expired = remaining === 0;

  return (
    <p className={`text-sm text-center ${expired ? 'text-error' : 'text-text-secondary'}`}>
      {expired ? 'QR Code expirado — recarregue a página' : `Expira em ${minutes}:${seconds.toString().padStart(2, '0')}`}
    </p>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<'PIX' | 'CARD'>('PIX');
  const [pixData, setPixData] = useState<{ qrCode: string; base64?: string; startedAt: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState('');
  const clearCart = useCartStore((s) => s.clear);

  const { data: order, isLoading } = useOrder(orderId);
  const initiate = useInitiatePayment();
  const [pollPayment, setPollPayment] = useState(false);
  const { data: payment } = usePaymentByOrder(orderId, pollPayment);

  // Redirect when paid
  useEffect(() => {
    if (payment?.status === 'PAID') setPollPayment(false);
    if (payment?.status === 'PAID' || order?.status === 'PAID') {
      clearCart();
      router.replace(`/orders`);
    }
    if (payment?.status === 'FAILED') {
      setPollPayment(false);
      setCardError('Pagamento falhou. Tente novamente.');
    }
  }, [payment?.status, order?.status, router, clearCart]);

  async function handlePix() {
    try {
      const result = await initiate.mutateAsync({ orderId, method: 'PIX' });
      setPixData({ qrCode: result.pixQrCode!, base64: result.pixQrCodeBase64, startedAt: Date.now() });
      setPollPayment(true);
    } catch (err: any) {
      toast({ title: err?.response?.data?.message || 'Erro ao gerar PIX', variant: 'error' });
    }
  }

  async function handleCopy() {
    if (!pixData?.qrCode) return;
    await navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  async function handleCardSubmit(cardData: CardFormData) {
    setCardLoading(true);
    setCardError('');
    try {
      const cardToken = await createCardToken(cardData);
      await initiate.mutateAsync({ orderId, method: 'CREDIT_CARD', cardToken });
      setPollPayment(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Falha ao processar pagamento com cartao';
      setCardError(msg);
      toast({ title: msg, variant: 'error' });
    } finally {
      setCardLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 animate-slide-up">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border hover:border-border-hover transition-colors">
          <svg className="w-4 h-4 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-serif text-text">Pagamento</h1>
      </div>

      {/* Order summary */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-4">
        <p className="text-text-secondary text-xs mb-1">Total do pedido</p>
        <p className="text-accent text-2xl font-serif">{formatCurrency(order?.totalAmount || 0)}</p>
        <p className="text-text-muted text-xs mt-1">Pedido #{order?.code}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['PIX', 'CARD'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t ? 'bg-primary text-white shadow-glow' : 'bg-surface border border-border text-text-secondary hover:border-border-hover'
            }`}
          >
            {t === 'PIX' ? 'PIX' : 'Cartão'}
          </button>
        ))}
      </div>

      {tab === 'PIX' ? (
        <div className="space-y-4">
          {!pixData ? (
            <button
              onClick={handlePix}
              disabled={initiate.isPending}
              className="w-full h-12 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold shadow-warm hover:shadow-glow transition-all"
            >
              {initiate.isPending ? 'Gerando PIX...' : 'Gerar QR Code PIX'}
            </button>
          ) : (
            <div className="space-y-4 animate-scale-in">
              <div className="bg-white p-4 rounded-xl flex items-center justify-center shadow-warm">
                <QRCodeSVG value={pixData.qrCode} size={220} />
              </div>
              <CountdownTimer startedAt={pixData.startedAt} />
              <div className="bg-surface-2 rounded-xl border border-border p-3 break-all text-xs text-text-secondary font-mono leading-relaxed">
                {pixData.qrCode}
              </div>
              <button
                onClick={handleCopy}
                className="w-full h-11 border border-primary text-primary rounded-xl font-semibold text-sm hover:bg-primary/10 transition-all"
              >
                {copied ? 'Copiado!' : 'Copiar código PIX'}
              </button>
              <p className="text-center text-xs text-text-secondary">
                Aguardando confirmação do pagamento...
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {cardError && (
            <div className="flex items-center gap-2 bg-error/10 border border-error/30 rounded-xl px-4 py-2.5 mb-3 animate-scale-in">
              <svg className="w-4 h-4 text-error flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L3.072 16.5C2.302 18.333 3.264 19 4.804 19z" />
              </svg>
              <p className="text-error text-xs">{cardError}</p>
            </div>
          )}
          <CreditCardForm
            onSubmit={handleCardSubmit}
            loading={cardLoading || initiate.isPending}
          />
        </div>
      )}
    </div>
  );
}
