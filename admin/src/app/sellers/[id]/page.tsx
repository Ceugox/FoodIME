'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { apiFetch } from '@/lib/api';

interface SellerData {
  user: { id: string; name: string; email: string; phone: string | null; createdAt: string };
  store: { id: string; name: string; isOpen: boolean; whatsapp: string; pixKey: string; commissionRate: number; createdAt: string } | null;
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
    totalNet: number;
  };
  recentOrders: Array<{
    id: string;
    code: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
}

export default function SellerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [commissionInput, setCommissionInput] = useState('');
  const [savingCommission, setSavingCommission] = useState(false);
  const [commissionMsg, setCommissionMsg] = useState('');

  useEffect(() => {
    apiFetch<SellerData>(`/admin/sellers/${params.id}`)
      .then((d) => {
        setData(d);
        if (d.store) setCommissionInput(String(Number(d.store.commissionRate) * 100));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  async function saveCommission() {
    if (!data?.store) return;
    const rate = parseFloat(commissionInput) / 100;
    if (isNaN(rate) || rate < 0 || rate > 30) {
      setCommissionMsg('Taxa deve ser entre 0% e 30%');
      return;
    }
    setSavingCommission(true);
    setCommissionMsg('');
    try {
      await apiFetch(`/admin/stores/${data.store.id}/commission`, {
        method: 'PATCH',
        body: JSON.stringify({ commissionRate: rate }),
      });
      setData({ ...data, store: { ...data.store, commissionRate: rate } });
      setCommissionMsg('Salvo!');
    } catch {
      setCommissionMsg('Erro ao salvar');
    } finally {
      setSavingCommission(false);
    }
  }

  if (loading) return <AdminLayout><p style={{ padding: 40, color: '#64748b' }}>Carregando...</p></AdminLayout>;
  if (!data) return <AdminLayout><p style={{ padding: 40, color: '#ef4444' }}>Vendedor nao encontrado</p></AdminLayout>;

  const { user, store, metrics, recentOrders } = data;

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

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 32 }}>
        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{user.name}</h3>
          <p style={{ fontSize: 14, color: '#64748b' }}>{user.email}</p>
          <p style={{ fontSize: 14, color: '#64748b' }}>{user.phone || 'Sem telefone'}</p>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
            Cadastro: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {store && (
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{store.name}</h3>
              <span className={store.isOpen ? 'badge badge-success' : 'badge badge-secondary'}>
                {store.isOpen ? 'Aberta' : 'Fechada'}
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#64748b' }}>WhatsApp: {store.whatsapp}</p>
            <p style={{ fontSize: 14, color: '#64748b' }}>Pix: {store.pixKey}</p>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: 8 }}>
                Taxa de Comissao (%)
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  value={commissionInput}
                  onChange={(e) => setCommissionInput(e.target.value)}
                  style={{ width: 80 }}
                />
                <span style={{ fontSize: 14, color: '#64748b' }}>%</span>
                <button
                  className="btn-primary"
                  onClick={saveCommission}
                  disabled={savingCommission}
                  style={{ fontSize: 13, padding: '6px 16px' }}
                >
                  {savingCommission ? 'Salvando...' : 'Salvar'}
                </button>
                {commissionMsg && (
                  <span style={{ fontSize: 13, color: commissionMsg === 'Salvo!' ? '#22c55e' : '#ef4444' }}>
                    {commissionMsg}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid-4" style={{ marginBottom: 32 }}>
        <div className="metric-card">
          <div className="value">{metrics.totalOrders}</div>
          <div className="label">Pedidos</div>
        </div>
        <div className="metric-card">
          <div className="value">R$ {(metrics.totalRevenue / 100).toFixed(2)}</div>
          <div className="label">Receita Bruta</div>
        </div>
        <div className="metric-card">
          <div className="value" style={{ color: '#f97316' }}>R$ {(metrics.totalCommission / 100).toFixed(2)}</div>
          <div className="label">Comissao</div>
        </div>
        <div className="metric-card">
          <div className="value" style={{ color: '#22c55e' }}>R$ {(metrics.totalNet / 100).toFixed(2)}</div>
          <div className="label">Liquido</div>
        </div>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Pedidos Recentes</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {recentOrders.length === 0 ? (
          <p style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Nenhum pedido</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Total</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{order.code}</td>
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
