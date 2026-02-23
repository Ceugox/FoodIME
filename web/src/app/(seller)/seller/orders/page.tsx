'use client';
import { useState } from 'react';
import { useSellerOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { OrderCardSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types/models.types';

const STATUS_MAP: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendente',  className: 'text-warning bg-warning/10 border-warning/30' },
  PAID:    { label: 'Pago',      className: 'text-success bg-success/10 border-success/30' },
  PICKED_UP: { label: 'Retirado', className: 'text-text-secondary bg-surface-2 border-border' },
  CANCELLED: { label: 'Cancelado', className: 'text-error bg-error/10 border-error/30' },
};

function ConfirmDialog({
  order,
  onConfirm,
  onCancel,
  loading,
}: {
  order: Order;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-8">
      <div className="w-full max-w-sm bg-surface rounded-2xl p-6 border border-border animate-slide-up">
        <h3 className="text-text font-bold text-lg mb-1">Confirmar retirada</h3>
        <p className="text-text-secondary text-sm mb-5">
          Marcar pedido <span className="text-accent font-semibold">#{order.code}</span> como retirado?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-border text-text-secondary text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-success text-white text-sm font-bold disabled:opacity-60"
          >
            {loading ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SellerOrderCard({
  order,
  onPickup,
}: {
  order: Order;
  onPickup: (order: Order) => void;
}) {
  const s = STATUS_MAP[order.status];
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-primary font-bold text-lg leading-tight">#{order.code}</p>
          <p className="text-text-secondary text-sm mt-0.5">{order.buyer?.name}</p>
          {order.buyer?.phone && (
            <p className="text-text-light text-xs">{order.buyer.phone}</p>
          )}
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${s.className}`}>
          {s.label}
        </span>
      </div>

      <div className="space-y-1 mb-3">
        {order.items.map((item) => (
          <p key={item.id} className="text-text text-sm">
            {item.quantity}× {item.product?.name}
          </p>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-text font-bold text-base">{formatCurrency(order.totalAmount)}</span>
        {order.status === 'PAID' && (
          <button
            onClick={() => onPickup(order)}
            className="px-4 h-9 bg-success text-white rounded-xl text-sm font-semibold"
          >
            Marcar retirado
          </button>
        )}
      </div>
    </div>
  );
}

export default function SellerOrdersPage() {
  const { data: orders, isLoading, isError, refetch } = useSellerOrders();
  const updateStatus = useUpdateOrderStatus();
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);

  async function handleConfirmPickup() {
    if (!confirmOrder) return;
    await updateStatus.mutateAsync({ id: confirmOrder.id, status: 'PICKED_UP' });
    setConfirmOrder(null);
  }

  const paid = orders?.filter((o) => o.status === 'PAID') ?? [];
  const others = orders?.filter((o) => o.status !== 'PAID') ?? [];

  return (
    <div className="px-5 pt-4">
      <h1 className="text-xl font-bold text-text mb-5">Pedidos</h1>

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
        </div>
      ) : (
        <>
          {paid.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-success uppercase tracking-wider mb-3">
                Para retirada ({paid.length})
              </p>
              {paid.map((o) => (
                <SellerOrderCard key={o.id} order={o} onPickup={setConfirmOrder} />
              ))}
            </div>
          )}
          {others.length > 0 && (
            <div>
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                Histórico
              </p>
              {others.map((o) => (
                <SellerOrderCard key={o.id} order={o} onPickup={setConfirmOrder} />
              ))}
            </div>
          )}
        </>
      )}

      {confirmOrder && (
        <ConfirmDialog
          order={confirmOrder}
          onConfirm={handleConfirmPickup}
          onCancel={() => setConfirmOrder(null)}
          loading={updateStatus.isPending}
        />
      )}
    </div>
  );
}
