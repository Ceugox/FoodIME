'use client';
import { useBuyerOrders } from '@/hooks/useOrders';
import { OrderCardSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types/models.types';

const STATUS_MAP: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: { label: 'Aguardando', className: 'text-warning bg-warning/10 border-warning/30' },
  PAID: { label: 'Pago', className: 'text-success bg-success/10 border-success/30' },
  PICKED_UP: { label: 'Retirado', className: 'text-text-secondary bg-surface-2 border-border' },
  CANCELLED: { label: 'Cancelado', className: 'text-error bg-error/10 border-error/30' },
};

function OrderCard({ order }: { order: Order }) {
  const s = STATUS_MAP[order.status];
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-bold text-text text-sm">#{order.code}</p>
          <p className="text-text-secondary text-xs mt-0.5">{order.store?.name}</p>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${s.className}`}>
          {s.label}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 mb-3">
        {order.items.map((item) => (
          <p key={item.id} className="text-text-secondary text-xs">
            {item.quantity}× {item.product?.name}
          </p>
        ))}
      </div>
      <div className="flex justify-between items-center border-t border-border pt-2">
        <span className="text-text-secondary text-xs">{formatDate(order.createdAt)}</span>
        <span className="font-bold text-accent">{formatCurrency(order.totalAmount)}</span>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { data: orders, isLoading, isError, refetch } = useBuyerOrders();

  return (
    <div className="px-5 pt-4">
      <h1 className="text-xl font-bold text-text mb-5">Meus Pedidos</h1>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <OrderCardSkeleton key={i} />)
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !orders?.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <svg className="w-12 h-12 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75m0-3H21" />
          </svg>
          <p className="text-text-secondary font-semibold">Nenhum pedido ainda</p>
          <p className="text-text-light text-sm">Faça seu primeiro pedido!</p>
        </div>
      ) : (
        orders.map((order) => <OrderCard key={order.id} order={order} />)
      )}
    </div>
  );
}
