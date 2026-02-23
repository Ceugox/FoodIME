'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSellerMetrics } from '@/hooks/useOrders';
import { useMyStore } from '@/hooks/useStores';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';
import { MetricCardSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { formatCurrency, formatDate } from '@/lib/utils';

type Period = 'today' | 'week' | 'month';
const PERIOD_LABELS: Record<Period, string> = { today: 'Hoje', week: 'Semana', month: 'Mês' };

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('today');

  const { data: store } = useMyStore();
  const { data: metrics, isLoading, isError, refetch } = useSellerMetrics();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const revenue = metrics?.revenue[period] ?? 0;
  const orderCount = metrics?.orders[period] ?? 0;
  const chart = metrics?.weeklyChart ?? [];
  const maxRevenue = Math.max(...chart.map((d) => d.revenue), 1);

  return (
    <div className="px-5 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-text-secondary text-sm">Olá, {user?.name?.split(' ')[0]}!</p>
          <h1 className="text-xl font-bold text-text mt-0.5">
            {store?.name || 'Configure sua loja'}
          </h1>
        </div>
        <div className={`w-3 h-3 rounded-full mt-1 ${store?.isOpen ? 'bg-success' : 'bg-error'}`} />
      </div>

      {/* Commission badge */}
      {store?.commissionRate !== undefined && (
        <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg mb-5">
          <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="text-primary text-xs font-semibold">
            Taxa FoodIME: {(Number(store.commissionRate) * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[0,1,2].map(i => <MetricCardSkeleton key={i} />)}
          </div>
          <div className="h-40 bg-surface rounded-2xl animate-shimmer" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          {/* Period selector */}
          <div className="flex gap-2 mb-5">
            {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([p, label]) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  period === p
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-border text-text-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Main revenue card */}
          <div className="bg-surface rounded-2xl border border-border p-6 flex flex-col items-center mb-5">
            <p className="text-text-secondary text-sm">Receita</p>
            <p className="text-4xl font-extrabold text-text mt-1">{formatCurrency(revenue)}</p>
            <p className="text-text-light text-sm mt-1">{orderCount} pedido{orderCount !== 1 ? 's' : ''}</p>
          </div>

          {/* Weekly bar chart */}
          {chart.length > 0 && (
            <div className="bg-surface rounded-2xl border border-border p-4 mb-5">
              <p className="text-text-secondary text-xs font-semibold mb-4">Últimos 7 dias</p>
              <div className="flex items-end gap-1.5 h-24">
                {chart.map((item, i) => {
                  const pct = Math.max((item.revenue / maxRevenue) * 100, 4);
                  const isLast = i === chart.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                        <div
                          className={`w-full rounded-t-md transition-all ${isLast ? 'bg-accent' : 'bg-primary'}`}
                          style={{ height: `${pct}%` }}
                          title={formatCurrency(item.revenue)}
                        />
                      </div>
                      <span className="text-[10px] text-text-light">{item.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top product */}
          {metrics?.topProduct && (
            <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 flex items-center gap-3 mb-5">
              <svg className="w-5 h-5 text-warning flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-text-secondary text-[11px]">Mais vendido do mês</p>
                <p className="text-text font-bold text-sm">{metrics.topProduct.name}</p>
              </div>
              <span className="text-warning font-bold text-base">{metrics.topProduct.totalSold} un.</span>
            </div>
          )}

          {/* Transactions */}
          <p className="text-text font-semibold text-base mb-3">Últimas transações</p>
          {!metrics?.transactions.length ? (
            <p className="text-center text-text-secondary text-sm py-8">Nenhuma transação ainda</p>
          ) : (
            <div className="space-y-2 mb-6">
              {metrics.transactions.slice(0, 10).map((tx) => (
                <div key={tx.id} className="bg-surface rounded-xl border border-border p-3 flex items-center justify-between">
                  <div>
                    <p className="text-text font-semibold text-sm">#{tx.orderCode}</p>
                    <p className="text-text-light text-xs mt-0.5">
                      {new Date(tx.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-secondary text-xs line-through">{formatCurrency(tx.grossAmount)}</p>
                    <p className="text-error text-[10px]">-{formatCurrency(tx.commission)} taxa</p>
                    <p className="text-success font-bold text-sm">{formatCurrency(tx.netAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full h-11 rounded-2xl border border-error/40 text-error text-sm font-semibold hover:bg-error/10 transition-colors"
          >
            Sair da conta
          </button>
        </>
      )}
    </div>
  );
}
