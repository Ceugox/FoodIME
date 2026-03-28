'use client';

import { useState } from 'react';
import { useMyStore } from '@/hooks/useStores';
import { useSellerMetrics } from '@/hooks/useOrders';
import { useLogout } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { MetricsSkeleton } from '@/components/common/loading-skeleton';
import { ErrorState } from '@/components/common/error-state';

type Period = 'today' | 'week' | 'month';

export default function SellerDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: store } = useMyStore();
  const { data: metrics, isLoading, isError, refetch } = useSellerMetrics();
  const logout = useLogout();
  const [period, setPeriod] = useState<Period>('today');

  if (isLoading) {
    return <div className="px-4 pt-6"><MetricsSkeleton /></div>;
  }

  if (isError) return <ErrorState message="Erro ao carregar métricas" onRetry={refetch} />;

  const revenue = metrics?.revenue[period] || 0;
  const orderCount = metrics?.orders[period] || 0;
  const maxChartRevenue = Math.max(...(metrics?.weeklyChart.map((d) => d.revenue) || [1]), 1);

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-serif text-text">Olá, {user?.name?.split(' ')[0]}</h1>
          {store && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${store.isOpen ? 'bg-success' : 'bg-error'}`} />
              <span className="text-text-secondary text-xs">{store.name}</span>
            </div>
          )}
        </div>
        <button onClick={() => logout.mutate()} className="text-xs text-error font-semibold hover:underline">Sair</button>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-4">
        {(['today', 'week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 h-9 rounded-xl text-xs font-semibold transition-all ${
              period === p ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'
            }`}
          >
            {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>

      {/* Revenue */}
      <div className="bg-surface rounded-2xl border border-border p-6 text-center mb-4">
        <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Receita</p>
        <p className="text-3xl font-bold text-accent">R$ {revenue.toFixed(2)}</p>
        <p className="text-text-muted text-xs mt-1">{orderCount} pedidos</p>
      </div>

      {/* Weekly Chart */}
      {metrics?.weeklyChart && (
        <div className="bg-surface rounded-xl border border-border p-4 mb-4">
          <p className="text-xs text-text-secondary mb-3 font-semibold">Últimos 7 dias</p>
          <div className="flex items-end gap-1 h-24">
            {metrics.weeklyChart.map((d, i) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-md transition-all ${i === 6 ? 'bg-accent' : 'bg-primary/40'}`}
                  style={{ height: `${Math.max((d.revenue / maxChartRevenue) * 80, 4)}px` }}
                />
                <span className="text-[9px] text-text-muted">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Product */}
      {metrics?.topProduct && (
        <div className="bg-surface rounded-xl border border-border p-4 mb-4">
          <p className="text-xs text-text-secondary mb-1 font-semibold">Mais vendido este mês</p>
          <p className="text-sm font-bold text-text">{metrics.topProduct.name}</p>
          <p className="text-text-muted text-xs">{metrics.topProduct.totalSold} vendidos</p>
        </div>
      )}

      {/* Recent Transactions */}
      {metrics?.transactions && metrics.transactions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-text-secondary mb-3 font-semibold uppercase tracking-wider">Transações recentes</p>
          <div className="space-y-2">
            {metrics.transactions.slice(0, 10).map((t) => (
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
    </div>
  );
}
