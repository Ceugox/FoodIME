'use client';

import { useMyStore } from '@/hooks/useStores';
import { useSellerMetrics } from '@/hooks/useOrders';
import { MetricsSkeleton } from '@/components/common/loading-skeleton';
import { ErrorState } from '@/components/common/error-state';

export default function SellerFinancialPage() {
  const { data: store } = useMyStore();
  const { data: metrics, isLoading, isError, refetch } = useSellerMetrics();

  if (isLoading) return <div className="px-4 pt-6"><MetricsSkeleton /></div>;
  if (isError) return <ErrorState message="Erro ao carregar dados financeiros" onRetry={refetch} />;

  const commissionRate = store ? (Number(store.commissionRate) * 100).toFixed(0) : '0';

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-serif text-text mb-6">Financeiro</h1>

      {/* Commission Info */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-4">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Taxa FoodIME</p>
        <p className="text-2xl font-bold text-accent">{commissionRate}%</p>
        <p className="text-text-muted text-xs mt-1">sobre cada venda</p>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-surface rounded-xl border border-border p-3 text-center">
          <p className="text-[10px] text-text-muted uppercase">Hoje</p>
          <p className="text-sm font-bold text-text">R$ {(metrics?.revenue?.today || 0).toFixed(2)}</p>
          <p className="text-[10px] text-text-muted">{metrics?.orders?.today || 0} pedidos</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-3 text-center">
          <p className="text-[10px] text-text-muted uppercase">Semana</p>
          <p className="text-sm font-bold text-text">R$ {(metrics?.revenue?.week || 0).toFixed(2)}</p>
          <p className="text-[10px] text-text-muted">{metrics?.orders?.week || 0} pedidos</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-3 text-center">
          <p className="text-[10px] text-text-muted uppercase">Mês</p>
          <p className="text-sm font-bold text-text">R$ {(metrics?.revenue?.month || 0).toFixed(2)}</p>
          <p className="text-[10px] text-text-muted">{metrics?.orders?.month || 0} pedidos</p>
        </div>
      </div>

      {/* Weekly Chart */}
      {metrics?.weeklyChart && (
        <div className="bg-surface rounded-xl border border-border p-4 mb-4">
          <p className="text-xs text-text-secondary mb-3 font-semibold">Receita — Últimos 7 dias</p>
          <div className="flex items-end gap-1 h-24">
            {metrics.weeklyChart.map((d: any, i: number) => {
              const max = Math.max(...metrics.weeklyChart.map((x: any) => x.revenue), 1);
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-md transition-all ${i === 6 ? 'bg-accent' : 'bg-primary/40'}`}
                    style={{ height: `${Math.max((d.revenue / max) * 80, 4)}px` }}
                  />
                  <span className="text-[9px] text-text-muted">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transactions */}
      {metrics?.transactions && metrics.transactions.length > 0 && (
        <div>
          <p className="text-xs text-text-secondary mb-3 font-semibold uppercase tracking-wider">Todas as transações</p>
          <div className="space-y-2">
            {metrics.transactions.map((t: any) => (
              <div key={t.id} className="bg-surface rounded-xl border border-border p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text">#{t.orderCode}</span>
                  <span className="text-[10px] text-text-muted">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-text-secondary line-through">R$ {t.grossAmount.toFixed(2)}</span>
                  <span className="text-xs text-error">-R$ {t.commission.toFixed(2)}</span>
                  <span className="text-xs text-success font-bold">R$ {t.netAmount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!metrics?.transactions || metrics.transactions.length === 0) && (
        <div className="text-center py-12">
          <p className="text-text-muted text-sm">Nenhuma transação ainda</p>
        </div>
      )}
    </div>
  );
}
