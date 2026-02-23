'use client';
import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useOrder } from '@/hooks/useOrders';
import { useInitiatePayment, usePaymentByOrder } from '@/hooks/usePayment';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils';

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
  const clearCart = useCartStore((s) => s.clear);

  const { data: order, isLoading } = useOrder(orderId);
  const initiate = useInitiatePayment();
  const [pollPayment, setPollPayment] = useState(true);
  const { data: payment } = usePaymentByOrder(orderId, pollPayment);

  // Redirect when paid
  useEffect(() => {
    if (payment?.status === 'PAID') setPollPayment(false);
    if (payment?.status === 'PAID' || order?.status === 'PAID') {
      clearCart();
      router.replace(`/orders`);
    }
  }, [payment?.status, order?.status, router, clearCart]);

  async function handlePix() {
    try {
      const result = await initiate.mutateAsync({ orderId, method: 'PIX' });
      setPixData({ qrCode: result.pixQrCode!, base64: result.pixQrCodeBase64, startedAt: Date.now() });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao gerar PIX');
    }
  }

  async function handleCopy() {
    if (!pixData?.qrCode) return;
    await navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-4">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border">
          <svg className="w-4 h-4 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-text">Pagamento</h1>
      </div>

      {/* Order summary */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-4">
        <p className="text-text-secondary text-xs mb-1">Total do pedido</p>
        <p className="text-accent text-2xl font-extrabold">{formatCurrency(order?.totalAmount || 0)}</p>
        <p className="text-text-secondary text-xs mt-1">Pedido #{order?.code}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['PIX', 'CARD'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              tab === t ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'
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
              className="w-full h-12 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-2xl font-bold transition-colors"
            >
              {initiate.isPending ? 'Gerando PIX...' : 'Gerar QR Code PIX'}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl flex items-center justify-center">
                <QRCodeSVG value={pixData.qrCode} size={220} />
              </div>
              <CountdownTimer startedAt={pixData.startedAt} />
              <div className="bg-surface rounded-xl border border-border p-3 break-all text-xs text-text-secondary font-mono leading-relaxed">
                {pixData.qrCode}
              </div>
              <button
                onClick={handleCopy}
                className="w-full h-11 border border-primary text-primary rounded-xl font-semibold text-sm hover:bg-primary/10 transition-colors"
              >
                {copied ? '✓ Copiado!' : 'Copiar código PIX'}
              </button>
              <p className="text-center text-xs text-text-secondary">
                Aguardando confirmação do pagamento...
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <svg className="w-12 h-12 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          <p className="text-text-secondary text-sm text-center">
            Pagamento via cartão de crédito em breve disponível no app web.
          </p>
        </div>
      )}
    </div>
  );
}
