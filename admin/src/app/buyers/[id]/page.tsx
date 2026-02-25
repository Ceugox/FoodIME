'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { apiFetch } from '@/lib/api';

interface BuyerData {
  user: { id: string; name: string; email: string; phone: string | null; createdAt: string };
  totalOrders: number;
  totalSpent: number;
  orders: Array<{
    id: string;
    code: string;
    totalAmount: number;
    status: string;
    store: { name: string };
    createdAt: string;
  }>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    PAID: 'bg-green-100 text-green-700 border-green-200',
    PICKED_UP: 'bg-gray-100 text-gray-600 border-gray-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

function MetricCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-2xl font-serif text-foreground">{value}</p>
      <p className="text-muted-foreground text-xs mt-1">{label}</p>
    </div>
  );
}

export default function BuyerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<BuyerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<BuyerData>(`/admin/buyers/${params.id}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <AdminLayout><p className="p-10 text-muted-foreground">Carregando...</p></AdminLayout>;
  if (!data) return <AdminLayout><p className="p-10 text-destructive">Comprador não encontrado</p></AdminLayout>;

  const { user, totalOrders, totalSpent, orders } = data;

  return (
    <AdminLayout>
      <button
        onClick={() => router.back()}
        className="mb-4 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
      >
        &larr; Voltar
      </button>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h3 className="text-lg font-serif text-foreground mb-3">{user.name}</h3>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <p className="text-sm text-muted-foreground">{user.phone || 'Sem telefone'}</p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          Cadastro: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard value={totalOrders} label="Pedidos" />
        <MetricCard value={`R$ ${(totalSpent / 100).toFixed(2)}`} label="Total Gasto" />
        <MetricCard
          value={`R$ ${totalOrders > 0 ? ((totalSpent / totalOrders) / 100).toFixed(2) : '0.00'}`}
          label="Ticket Médio"
        />
      </div>

      <h3 className="text-base font-serif text-foreground mb-4">Histórico de Pedidos</h3>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {orders.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Nenhum pedido</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loja</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold font-mono text-foreground">{order.code}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{order.store?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-foreground">R$ {(Number(order.totalAmount) / 100).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
