'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { apiFetch } from '@/lib/api';

interface DashboardData {
  users: { total: number; buyers: number; sellers: number; admins: number };
  orders: { total: number; pending: number; paid: number; picked_up: number; cancelled: number };
  payments: { totalGross: number; totalCommission: number; totalNet: number };
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

  if (loading) return <AdminLayout><p style={{ padding: 40, color: '#64748b' }}>Carregando...</p></AdminLayout>;
  if (!data) return <AdminLayout><p style={{ padding: 40, color: '#ef4444' }}>Erro ao carregar dados</p></AdminLayout>;

  return (
    <AdminLayout>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Dashboard</h2>

      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Usuarios
      </h3>
      <div className="grid-4" style={{ marginBottom: 32 }}>
        <div className="metric-card">
          <div className="value">{data.users.total}</div>
          <div className="label">Total</div>
        </div>
        <div className="metric-card">
          <div className="value">{data.users.buyers}</div>
          <div className="label">Compradores</div>
        </div>
        <div className="metric-card">
          <div className="value">{data.users.sellers}</div>
          <div className="label">Vendedores</div>
        </div>
        <div className="metric-card">
          <div className="value">{data.users.admins}</div>
          <div className="label">Admins</div>
        </div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Pedidos
      </h3>
      <div className="grid-4" style={{ marginBottom: 32 }}>
        <div className="metric-card">
          <div className="value">{data.orders.total}</div>
          <div className="label">Total</div>
        </div>
        <div className="metric-card">
          <div className="value" style={{ color: '#eab308' }}>{data.orders.pending}</div>
          <div className="label">Pendentes</div>
        </div>
        <div className="metric-card">
          <div className="value" style={{ color: '#22c55e' }}>{data.orders.paid}</div>
          <div className="label">Pagos</div>
        </div>
        <div className="metric-card">
          <div className="value" style={{ color: '#ef4444' }}>{data.orders.cancelled}</div>
          <div className="label">Cancelados</div>
        </div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Financeiro
      </h3>
      <div className="grid-3">
        <div className="metric-card">
          <div className="value">R$ {(data.payments.totalGross / 100).toFixed(2)}</div>
          <div className="label">Receita Bruta</div>
        </div>
        <div className="metric-card">
          <div className="value" style={{ color: '#f97316' }}>R$ {(data.payments.totalCommission / 100).toFixed(2)}</div>
          <div className="label">Comissao FoodIME</div>
        </div>
        <div className="metric-card">
          <div className="value" style={{ color: '#22c55e' }}>R$ {(data.payments.totalNet / 100).toFixed(2)}</div>
          <div className="label">Repasse Vendedores</div>
        </div>
      </div>
    </AdminLayout>
  );
}
