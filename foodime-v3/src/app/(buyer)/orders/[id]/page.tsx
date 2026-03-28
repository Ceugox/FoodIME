'use client';

import { use } from 'react';
import Link from 'next/link';
import { useOrder } from '@/hooks/useOrders';
import { ErrorState } from '@/components/common/error-state';

const STEPS = ['PENDING', 'PAID', 'READY', 'PICKED_UP'];
const STEP_LABELS = ['Pendente', 'Pago', 'Pronto', 'Retirado'];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, isLoading, isError, refetch } = useOrder(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !order) return <ErrorState message="Pedido não encontrado" onRetry={refetch} />;

  const currentStep = order.status === 'CANCELLED' ? -1 : STEPS.indexOf(order.status);

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/orders" className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border">
          <svg className="w-4 h-4 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-text">Pedido #{order.code}</h1>
      </div>

      {order.status === 'CANCELLED' ? (
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6 text-center">
          <p className="text-error font-semibold">Pedido cancelado</p>
        </div>
      ) : (
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((step, i) => (
            <div key={step} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= currentStep ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted border border-border'
              }`}>
                {i + 1}
              </div>
              <p className={`text-[9px] font-semibold ${i <= currentStep ? 'text-primary' : 'text-text-muted'}`}>
                {STEP_LABELS[i]}
              </p>
              {i < STEPS.length - 1 && (
                <div className={`absolute h-0.5 w-full ${i < currentStep ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border p-4 mb-4">
        <p className="text-xs text-text-secondary mb-2">{order.store?.name}</p>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-1">
            <span className="text-text">{item.quantity}x {item.product?.name}</span>
            <span className="text-text-secondary">R$ {(Number(item.priceAtPurchase) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-border mt-2 pt-2 flex justify-between">
          <span className="text-sm font-bold text-text">Total</span>
          <span className="text-sm font-bold text-primary">R$ {Number(order.totalAmount).toFixed(2)}</span>
        </div>
      </div>

      {order.payment && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary">Pagamento: {order.payment.method === 'PIX' ? 'Pix' : 'Cartão de Crédito'}</p>
          <p className="text-xs text-text-muted mt-1">
            Status: {order.payment.status}
          </p>
        </div>
      )}
    </div>
  );
}
