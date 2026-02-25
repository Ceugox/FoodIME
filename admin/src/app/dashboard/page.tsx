'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { apiFetch } from '@/lib/api';

interface DashboardData {
  users: Record<string, number>;
  orders: Record<string, number>;
  payments: { count: number; gross: number; commission: number; net: number };
}

function MetricCard({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className={`text-2xl font-serif ${color || 'text-foreground'}`}>{value}</p>
      <p className="text-muted-foreground text-xs mt-1">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<DashboardData>('/admin/dashboard')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><p className="p-10 text-muted-foreground">Carregando...</p></AdminLayout>;
  if (!data) return <AdminLayout><p className="p-10 text-destructive">Erro ao carregar dados</p></AdminLayout>;

  return (
    <AdminLayout>
      <h2 className="text-2xl font-serif text-foreground mb-6">Dashboard</h2>

      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Usuários
      </h3>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard value={Object.values(data.users).reduce((a, b) => a + b, 0)} label="Total" />
        <MetricCard value={data.users.BUYER || 0} label="Compradores" />
        <MetricCard value={data.users.SELLER || 0} label="Vendedores" />
        <MetricCard value={data.users.ADMIN || 0} label="Admins" />
      </div>

      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Pedidos
      </h3>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard value={Object.values(data.orders).reduce((a, b) => a + b, 0)} label="Total" />
        <MetricCard value={data.orders.PENDING || 0} label="Pendentes" color="text-yellow-500" />
        <MetricCard value={(data.orders.PAID || 0) + (data.orders.PICKED_UP || 0)} label="Pagos" color="text-green-500" />
        <MetricCard value={data.orders.CANCELLED || 0} label="Cancelados" color="text-red-500" />
      </div>

      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Financeiro
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <MetricCard value={`R$ ${(data.payments.gross / 100).toFixed(2)}`} label="Receita Bruta" />
        <MetricCard value={`R$ ${(data.payments.commission / 100).toFixed(2)}`} label="Comissão FoodIME" color="text-primary" />
        <MetricCard value={`R$ ${(data.payments.net / 100).toFixed(2)}`} label="Repasse Vendedores" color="text-green-500" />
      </div>
    </AdminLayout>
  );
}
