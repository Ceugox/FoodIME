'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useBuyerOrders } from '@/hooks/useOrders';
import { ErrorState } from '@/components/common/error-state';

const ACTIVE_STATUSES = ['PENDING', 'PAID', 'READY'];
const STEPS = ['PENDING', 'PAID', 'READY', 'PICKED_UP'];
const STEP_LABELS = ['Pendente', 'Pago', 'Pronto', 'Retirado'];

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  PENDING: { text: 'Pendente', color: 'bg-warning/15 text-warning' },
  PAID: { text: 'Pago', color: 'bg-primary/15 text-primary' },
  READY: { text: 'Pronto!', color: 'bg-success/15 text-success' },
  PICKED_UP: { text: 'Retirado', color: 'bg-text-muted/15 text-text-secondary' },
  CANCELLED: { text: 'Cancelado', color: 'bg-error/15 text-error' },
};

export default function BuyerOrdersPage() {
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const { data: orders, isLoading, isError, refetch } = useBuyerOrders(5000);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) return <ErrorState message="Erro ao carregar pedidos" onRetry={refetch} />;

  const activeOrders = orders?.filter((o) => ACTIVE_STATUSES.includes(o.status)) || [];
  const displayOrders = filter === 'active' ? activeOrders : (orders || []);

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-serif text-text mb-4">Meus Pedidos</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setFilter('active')}
          className={`flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-semibold transition-all ${
            filter === 'active' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'
          }`}
        >
          Ativo
          {activeOrders.length > 0 && (
            <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
              filter === 'active' ? 'bg-white/25 text-white' : 'bg-primary/20 text-primary'
            }`}>
              {activeOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 h-9 rounded-xl text-xs font-semibold transition-all ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'
          }`}
        >
          Todos
        </button>
      </div>

      {displayOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-muted text-sm">
            {filter === 'active' ? 'Nenhum pedido ativo' : 'Nenhum pedido ainda'}
          </p>
          <Link href="/home" className="text-accent font-semibold text-sm hover:underline mt-2 inline-block">
            Explorar lojas
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {displayOrders.map((order) => {
          const status = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
          const isActive = ACTIVE_STATUSES.includes(order.status);
          const currentStep = STEPS.indexOf(order.status);

          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-surface rounded-2xl border border-border p-4 hover:border-border-hover transition-all animate-slide-up"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-text">#{order.code}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>
                  {status.text}
                </span>
              </div>
              <p className="text-text-secondary text-xs mb-1">{order.store?.name}</p>

              {/* Step tracker for active orders */}
              {isActive && (
                <div className="flex items-center gap-0 my-3">
                  {STEPS.slice(0, 3).map((step, i) => (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                        i <= currentStep ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted border border-border'
                      }`}>
                        {i < currentStep ? (
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : i + 1}
                      </div>
                      <p className={`text-[8px] font-semibold ml-1 ${i <= currentStep ? 'text-primary' : 'text-text-muted'}`}>
                        {STEP_LABELS[i]}
                      </p>
                      {i < 2 && <div className={`flex-1 h-px mx-1 ${i < currentStep ? 'bg-primary' : 'bg-border'}`} />}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-1">
                <p className="text-text-muted text-xs">
                  {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                </p>
                <p className="text-sm font-bold text-primary">R$ {Number(order.totalAmount).toFixed(2)}</p>
              </div>
              <p className="text-text-muted text-[10px] mt-0.5">
                {new Date(order.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
