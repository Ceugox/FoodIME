'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useOrder } from '@/hooks/useOrders';
import { useInitiatePayment, useSyncPayment } from '@/hooks/usePayment';
import { useCartStore } from '@/store/cartStore';
import { toast } from '@/components/common/toast';
import { PIX_EXPIRY_MINUTES } from '@/lib/constants';

type Tab = 'PIX' | 'CARD';

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clear = useCartStore((s) => s.clear);
  const initiate = useInitiatePayment();
  const syncPayment = useSyncPayment();

  const [tab, setTab] = useState<Tab>('PIX');
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string } | null>(null);
  const [pixExpiry, setPixExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('');
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [syncedPaymentId, setSyncedPaymentId] = useState<string | null>(null);

  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
  const mercadoPagoStatus = searchParams.get('status') || searchParams.get('collection_status');
  const shouldPoll = paymentStarted || !!paymentId;
  const { data: order } = useOrder(orderId, shouldPoll ? 3000 : false);

  const isPaid = order?.status === 'PAID' || order?.status === 'READY' || order?.status === 'PICKED_UP';

  useEffect(() => {
    if (isPaid) {
      clear();
      toast({ title: 'Pagamento confirmado!', variant: 'success' });
      setTimeout(() => router.push('/orders'), 1500);
    }
  }, [isPaid, clear, router]);

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

  useEffect(() => {
    if (!paymentId || syncedPaymentId === paymentId) return;

    setSyncedPaymentId(paymentId);
    setPaymentStarted(true);

    syncPayment.mutate(
      { orderId, paymentId },
      {
        onSuccess: (result) => {
          const status = result?.data?.status;
          if (status === 'approved') {
            toast({ title: 'Pagamento aprovado pelo Mercado Pago. Confirmando pedido...', variant: 'success' });
          } else if (status === 'pending' || status === 'in_process') {
            toast({ title: 'Pagamento recebido. Aguardando confirmação final...', variant: 'success' });
          } else if (status === 'rejected' || status === 'cancelled') {
            toast({ title: 'Pagamento não aprovado pelo Mercado Pago', variant: 'error' });
          }
        },
        onError: (err: any) => {
          toast({ title: err?.message || 'Erro ao sincronizar pagamento', variant: 'error' });
        },
      },
    );
  }, [orderId, paymentId, syncPayment, syncedPaymentId]);

  useEffect(() => {
    if (!mercadoPagoStatus || paymentId) return;

    if (mercadoPagoStatus === 'approved' || mercadoPagoStatus === 'pending' || mercadoPagoStatus === 'in_process') {
      setPaymentStarted(true);
      toast({ title: 'Voltamos do Mercado Pago. Confirmando pagamento...', variant: 'success' });
      return;
    }

    if (mercadoPagoStatus === 'rejected' || mercadoPagoStatus === 'cancelled' || mercadoPagoStatus === 'failure') {
      toast({ title: 'Pagamento não aprovado pelo Mercado Pago', variant: 'error' });
    }
  }, [mercadoPagoStatus, paymentId]);

  const handlePixPayment = useCallback(async () => {
    try {
      const result = await initiate.mutateAsync({ orderId, method: 'PIX' });
      const checkoutUrl = result?.data?.checkoutUrl;
      if (!checkoutUrl) throw new Error('Checkout PIX indisponível');
      window.location.href = checkoutUrl;
    } catch (err: any) {
      toast({ title: err?.message || 'Erro ao gerar PIX', variant: 'error' });
    }
  }, [orderId, initiate]);

  const handleCardPayment = useCallback(async () => {
    try {
      const result = await initiate.mutateAsync({ orderId, method: 'CREDIT_CARD' });
      const checkoutUrl = result?.data?.checkoutUrl;

      if (!checkoutUrl) {
        throw new Error('Checkout do Mercado Pago indisponível');
      }

      window.location.href = checkoutUrl;
    } catch (err: any) {
      toast({ title: err?.message || 'Erro ao iniciar checkout com cartão', variant: 'error' });
    }
  }, [initiate, orderId]);

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

      {tab === 'CARD' && (
        <div className="bg-surface rounded-2xl border border-border p-6">
          <div className="rounded-xl bg-background border border-border p-4 mb-4">
            <p className="text-sm font-semibold text-text mb-2">Pagamento seguro pelo Mercado Pago</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Ao continuar, você será redirecionado para o checkout hospedado do Mercado Pago para finalizar o
              pagamento com cartão. Depois disso, você volta automaticamente para esta tela e o pedido é sincronizado.
            </p>
          </div>

          {mercadoPagoStatus && !isPaid && (
            <div className="rounded-xl border border-border bg-background p-4 mb-4">
              <p className="text-xs font-semibold text-text-secondary mb-1">Retorno do Mercado Pago</p>
              <p className="text-sm text-text">
                Status atual: <span className="font-semibold">{mercadoPagoStatus}</span>
              </p>
            </div>
          )}

          <button
            onClick={handleCardPayment}
            disabled={initiate.isPending || syncPayment.isPending}
            className="w-full h-12 bg-primary text-white rounded-xl font-semibold text-sm mt-6 disabled:opacity-60"
          >
            {initiate.isPending || syncPayment.isPending ? 'Processando...' : 'Pagar com cartão no Mercado Pago'}
          </button>
        </div>
      )}

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
