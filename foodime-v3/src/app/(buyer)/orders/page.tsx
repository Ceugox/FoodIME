'use client';

import Link from 'next/link';
import { useBuyerOrders } from '@/hooks/useOrders';
import { ErrorState } from '@/components/common/error-state';

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  PENDING: { text: 'Pendente', color: 'bg-warning/15 text-warning' },
  PAID: { text: 'Pago', color: 'bg-primary/15 text-primary' },
  READY: { text: 'Pronto', color: 'bg-success/15 text-success' },
  PICKED_UP: { text: 'Retirado', color: 'bg-text-muted/15 text-text-secondary' },
  CANCELLED: { text: 'Cancelado', color: 'bg-error/15 text-error' },
};

export default function BuyerOrdersPage() {
  const hasActiveOrders = true; // Always refetch — simplification
  const { data: orders, isLoading, isError, refetch } = useBuyerOrders(hasActiveOrders ? 5000 : undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) return <ErrorState message="Erro ao carregar pedidos" onRetry={refetch} />;

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-serif text-text mb-6">Meus Pedidos</h1>

      {(!orders || orders.length === 0) && (
        <div className="text-center py-12">
          <p className="text-text-muted text-sm">Nenhum pedido ainda</p>
          <Link href="/home" className="text-accent font-semibold text-sm hover:underline mt-2 inline-block">
            Explorar lojas
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {orders?.map((order) => {
          const status = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-surface rounded-xl border border-border p-4 hover:border-border-hover transition-all animate-slide-up"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-text">#{order.code}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>
                  {status.text}
                </span>
              </div>
              <p className="text-text-secondary text-xs">{order.store?.name}</p>
              <p className="text-text-muted text-xs mt-1">
                {order.items.length} {order.items.length === 1 ? 'item' : 'itens'} — R$ {Number(order.totalAmount).toFixed(2)}
              </p>
              <p className="text-text-muted text-[10px] mt-1">
                {new Date(order.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
