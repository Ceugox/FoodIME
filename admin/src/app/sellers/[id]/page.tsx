'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { apiFetch } from '@/lib/api';

interface SellerData {
  user: { id: string; name: string; email: string; phone: string | null; createdAt?: string };
  store: { id: string; name: string; isOpen: boolean; whatsapp: string; pixKey: string; commissionRate: number; createdAt: string } | null;
  metrics: {
    totalOrders: number;
    totalGross: number;
    totalCommission: number;
    totalNet: number;
    monthRevenue: number;
    monthOrders: number;
  } | null;
  recentOrders: Array<{
    id: string;
    code: string;
    totalAmount: number;
    status: string;
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

function MetricCard({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className={`text-2xl font-serif ${color || 'text-foreground'}`}>{value}</p>
      <p className="text-muted-foreground text-xs mt-1">{label}</p>
    </div>
  );
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

  if (loading) return <AdminLayout><p className="p-10 text-muted-foreground">Carregando...</p></AdminLayout>;
  if (!data) return <AdminLayout><p className="p-10 text-destructive">Vendedor não encontrado</p></AdminLayout>;

  const { user, store, metrics, recentOrders } = data;

  return (
    <AdminLayout>
      <button
        onClick={() => router.back()}
        className="mb-4 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
      >
        &larr; Voltar
      </button>

      <div className="flex gap-6 items-start mb-8">
        <div className="flex-1 bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-serif text-foreground mb-3">{user.name}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-sm text-muted-foreground">{user.phone || 'Sem telefone'}</p>
          {user.createdAt && (
            <p className="text-xs text-muted-foreground/70 mt-2">
              Cadastro: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>

        {store && (
          <div className="flex-1 bg-card rounded-xl border border-border p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-serif text-foreground">{store.name}</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                store.isOpen
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                {store.isOpen ? 'Aberta' : 'Fechada'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">WhatsApp: {store.whatsapp}</p>
            <p className="text-sm text-muted-foreground">Pix: {store.pixKey}</p>
            <div className="mt-4 pt-4 border-t border-border">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Taxa de Comissão (%)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  value={commissionInput}
                  onChange={(e) => setCommissionInput(e.target.value)}
                  className="w-20 h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary outline-none"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <button
                  onClick={saveCommission}
                  disabled={savingCommission}
                  className="px-4 py-1.5 bg-primary hover:bg-primary-light text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors"
                >
                  {savingCommission ? 'Salvando...' : 'Salvar'}
                </button>
                {commissionMsg && (
                  <span className={`text-sm ${commissionMsg === 'Salvo!' ? 'text-green-500' : 'text-destructive'}`}>
                    {commissionMsg}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {metrics && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <MetricCard value={metrics.totalOrders} label="Pedidos" />
          <MetricCard value={`R$ ${(metrics.totalGross / 100).toFixed(2)}`} label="Receita Bruta" />
          <MetricCard value={`R$ ${(metrics.totalCommission / 100).toFixed(2)}`} label="Comissão" color="text-primary" />
          <MetricCard value={`R$ ${(metrics.totalNet / 100).toFixed(2)}`} label="Líquido" color="text-green-500" />
        </div>
      )}

      <h3 className="text-base font-serif text-foreground mb-4">Pedidos Recentes</h3>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {recentOrders.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Nenhum pedido</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold font-mono text-foreground">{order.code}</td>
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
