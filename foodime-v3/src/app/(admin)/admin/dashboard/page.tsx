'use client';

import { useDashboard } from '@/hooks/useAdmin';
import { MetricsSkeleton } from '@/components/common/loading-skeleton';
import { ErrorState } from '@/components/common/error-state';

export default function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard();

  if (isLoading) return <div className="p-6"><MetricsSkeleton /></div>;
  if (isError) return <ErrorState message="Erro ao carregar dashboard" onRetry={refetch} />;

  const d = data?.data;

  const cards = [
    { title: 'Usuários', items: [
      { label: 'Total', value: d?.users.total },
      { label: 'Compradores', value: d?.users.buyers },
      { label: 'Vendedores', value: d?.users.sellers },
      { label: 'Admins', value: d?.users.admins },
    ]},
    { title: 'Pedidos', items: [
      { label: 'Total', value: d?.orders.total },
      { label: 'Pendentes', value: d?.orders.pending },
      { label: 'Pagos', value: d?.orders.paid },
      { label: 'Cancelados', value: d?.orders.cancelled },
    ]},
    { title: 'Financeiro', items: [
      { label: 'Receita bruta', value: `R$ ${(d?.payments.grossRevenue || 0).toFixed(2)}` },
      { label: 'Comissão', value: `R$ ${(d?.payments.commission || 0).toFixed(2)}` },
      { label: 'Repasse líquido', value: `R$ ${(d?.payments.netPayout || 0).toFixed(2)}` },
    ]},
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-serif text-text mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-surface rounded-2xl border border-border p-5">
            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">{card.title}</h2>
            <div className="space-y-3">
              {card.items.map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-text-muted text-sm">{item.label}</span>
                  <span className="text-text font-semibold text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
