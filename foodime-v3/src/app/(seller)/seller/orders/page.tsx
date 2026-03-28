'use client';

import { useSellerOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { ErrorState } from '@/components/common/error-state';
import { toast } from '@/components/common/toast';
import { useState } from 'react';

export default function SellerOrdersPage() {
  const { data: orders, isLoading, isError, refetch } = useSellerOrders();
  const updateStatus = useUpdateOrderStatus();
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: string; label: string } | null>(null);

  async function handleUpdateStatus(id: string, status: string) {
    try {
      await updateStatus.mutateAsync({ id, status });
      setConfirmAction(null);
      toast({ title: 'Status atualizado!', variant: 'success' });
    } catch (err: any) {
      toast({ title: err?.message || 'Erro ao atualizar', variant: 'error' });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) return <ErrorState message="Erro ao carregar pedidos" onRetry={refetch} />;

  const paid = orders?.filter((o) => o.status === 'PAID') || [];
  const ready = orders?.filter((o) => o.status === 'READY') || [];
  const history = orders?.filter((o) => o.status === 'PICKED_UP') || [];

  function OrderCard({ order, actionLabel, actionStatus }: { order: any; actionLabel?: string; actionStatus?: string }) {
    return (
      <div className="bg-surface rounded-xl border border-border p-4 animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-text">#{order.code}</span>
          <span className="text-[10px] text-text-muted">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="text-text-secondary text-xs">{order.buyer?.name}</p>
        {order.buyer?.phone && <p className="text-text-muted text-[10px]">{order.buyer.phone}</p>}
        <div className="mt-2 space-y-1">
          {order.items.map((item: any) => (
            <p key={item.id} className="text-text text-xs">{item.quantity}x {item.product?.name}</p>
          ))}
        </div>
        <p className="text-primary font-bold text-sm mt-2">R$ {Number(order.totalAmount).toFixed(2)}</p>
        {actionLabel && actionStatus && (
          <button
            onClick={() => setConfirmAction({ id: order.id, status: actionStatus, label: actionLabel })}
            className="w-full mt-3 h-10 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-serif text-text mb-6">Pedidos</h1>

      {paid.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-accent uppercase tracking-wider mb-3">Novos pedidos ({paid.length})</h2>
          <div className="space-y-3">
            {paid.map((o) => <OrderCard key={o.id} order={o} actionLabel="Marcar pronto" actionStatus="READY" />)}
          </div>
        </section>
      )}

      {ready.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-success uppercase tracking-wider mb-3">Prontos ({ready.length})</h2>
          <div className="space-y-3">
            {ready.map((o) => <OrderCard key={o.id} order={o} actionLabel="Marcar retirado" actionStatus="PICKED_UP" />)}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Histórico</h2>
          <div className="space-y-3">
            {history.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        </section>
      )}

      {orders?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-muted text-sm">Nenhum pedido ainda</p>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6" onClick={() => setConfirmAction(null)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text mb-2">{confirmAction.label}?</h3>
            <p className="text-text-secondary text-sm mb-4">Confirmar mudança de status do pedido.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)} className="flex-1 h-11 bg-surface-2 border border-border rounded-xl text-text-secondary font-semibold text-sm">Cancelar</button>
              <button onClick={() => handleUpdateStatus(confirmAction.id, confirmAction.status)} disabled={updateStatus.isPending} className="flex-1 h-11 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-60">
                {updateStatus.isPending ? 'Atualizando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
