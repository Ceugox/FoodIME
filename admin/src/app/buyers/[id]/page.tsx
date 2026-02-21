'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { apiFetch } from '@/lib/api';

interface BuyerData {
  user: { id: string; name: string; email: string; phone: string | null; createdAt: string };
  stats: { totalOrders: number; totalSpent: number };
  orders: Array<{
    id: string;
    code: string;
    total: number;
    status: string;
    storeName: string;
    createdAt: string;
  }>;
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

  if (loading) return <AdminLayout><p style={{ padding: 40, color: '#64748b' }}>Carregando...</p></AdminLayout>;
  if (!data) return <AdminLayout><p style={{ padding: 40, color: '#ef4444' }}>Comprador nao encontrado</p></AdminLayout>;

  const { user, stats, orders } = data;

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      PENDING: 'badge badge-warning',
      PAID: 'badge badge-success',
      PICKED_UP: 'badge badge-secondary',
      CANCELLED: 'badge badge-error',
    };
    return <span className={map[status] || 'badge badge-secondary'}>{status}</span>;
  }

  return (
    <AdminLayout>
      <button onClick={() => router.back()} className="btn-outline" style={{ marginBottom: 16 }}>
        ← Voltar
      </button>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{user.name}</h3>
        <p style={{ fontSize: 14, color: '#64748b' }}>{user.email}</p>
        <p style={{ fontSize: 14, color: '#64748b' }}>{user.phone || 'Sem telefone'}</p>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
          Cadastro: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
        </p>
      </div>

      <div className="grid-3" style={{ marginBottom: 32 }}>
        <div className="metric-card">
          <div className="value">{stats.totalOrders}</div>
          <div className="label">Pedidos</div>
        </div>
        <div className="metric-card">
          <div className="value">R$ {(stats.totalSpent / 100).toFixed(2)}</div>
          <div className="label">Total Gasto</div>
        </div>
        <div className="metric-card">
          <div className="value">
            R$ {stats.totalOrders > 0 ? ((stats.totalSpent / stats.totalOrders) / 100).toFixed(2) : '0.00'}
          </div>
          <div className="label">Ticket Medio</div>
        </div>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Historico de Pedidos</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {orders.length === 0 ? (
          <p style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Nenhum pedido</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Loja</th>
                <th>Total</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{order.code}</td>
                  <td>{order.storeName}</td>
                  <td>R$ {(order.total / 100).toFixed(2)}</td>
                  <td>{statusBadge(order.status)}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
