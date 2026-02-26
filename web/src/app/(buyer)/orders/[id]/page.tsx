'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/hooks/useOrders';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ErrorState } from '@/components/common/ErrorState';
import type { OrderStatus } from '@/types/models.types';

const STATUS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'PENDING', label: 'Pedido criado' },
  { key: 'PAID', label: 'Pagamento confirmado' },
  { key: 'READY', label: 'Pronto para retirada' },
  { key: 'PICKED_UP', label: 'Retirado' },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  PENDING: 0,
  PAID: 1,
  READY: 2,
  PICKED_UP: 3,
  CANCELLED: -1,
};

function Timeline({ currentStatus }: { currentStatus: OrderStatus }) {
  const currentIdx = STATUS_ORDER[currentStatus];
  const isCancelled = currentStatus === 'CANCELLED';

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 bg-error/10 border border-error/20 rounded-xl px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-error flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-error font-semibold text-sm">Pedido cancelado</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const isLast = i === STATUS_STEPS.length - 1;
        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-primary text-white' : 'bg-surface-2 border border-border text-text-muted'}`}>
                {done ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {!isLast && (
                <div className={`w-0.5 h-6 ${i < currentIdx ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
            <p className={`text-sm pt-0.5 ${done ? 'text-text font-semibold' : 'text-text-muted'}`}>
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: order, isLoading, isError, refetch } = useOrder(id);

  async function handleShare() {
    if (!order) return;
    const text = `Comprovante FoodIME\nPedido #${order.code}\nTotal: ${formatCurrency(order.totalAmount)}\nStatus: ${order.status}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Pedido #${order.code}`, text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
    }
  }

  if (isLoading) {
    return (
      <div className="px-5 pt-4 space-y-4 animate-slide-up">
        <div className="h-8 w-32 bg-surface-2 rounded-xl animate-shimmer" />
        <div className="h-40 bg-surface-2 rounded-xl animate-shimmer" />
        <div className="h-32 bg-surface-2 rounded-xl animate-shimmer" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="px-5 pt-4">
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  const paymentMethodLabel = order.payment?.method === 'PIX' ? 'PIX' : order.payment?.method === 'CREDIT_CARD' ? 'Cartão de Crédito' : '—';

  return (
    <div className="px-5 pt-4 pb-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border hover:border-border-hover transition-colors">
          <svg className="w-4 h-4 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-serif text-text">Pedido #{order.code}</h1>
      </div>

      {/* Status + Loja */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-text-secondary text-xs">Loja</p>
          <p className="text-text-muted text-xs">{formatDate(order.createdAt)}</p>
        </div>
        <p className="text-text font-serif text-base">{order.store?.name}</p>
      </div>

      {/* Timeline */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-4">
        <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">Status</p>
        <Timeline currentStatus={order.status} />
      </div>

      {/* Itens */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-4">
        <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">Itens</p>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center">
              <p className="text-text text-sm">{item.quantity}× {item.product?.name}</p>
              <p className="text-text-secondary text-sm">{formatCurrency(item.priceAtPurchase * item.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
          <p className="text-text font-semibold text-sm">Total</p>
          <p className="text-accent font-serif text-lg">{formatCurrency(order.totalAmount)}</p>
        </div>
      </div>

      {/* Pagamento */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-6">
        <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">Pagamento</p>
        <div className="flex justify-between items-center">
          <p className="text-text text-sm">Método</p>
          <p className="text-text-secondary text-sm">{paymentMethodLabel}</p>
        </div>
      </div>

      {/* Share */}
      <button
        onClick={handleShare}
        className="w-full h-12 border border-primary text-primary rounded-xl font-semibold text-sm hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        Compartilhar comprovante
      </button>
    </div>
  );
}
