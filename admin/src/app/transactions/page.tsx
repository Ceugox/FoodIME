'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { apiFetch } from '@/lib/api';

interface Transaction {
  id: string;
  orderCode: string;
  method: string;
  status: string;
  grossAmount: number;
  commission: number;
  netAmount: number;
  buyerName: string;
  storeName: string;
  createdAt: string;
}

interface TransactionsResponse {
  payments: Transaction[];
  totals: { gross: number; commission: number; net: number };
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    PAID: 'bg-green-100 text-green-700 border-green-200',
    REFUNDED: 'bg-red-100 text-red-700 border-red-200',
    FAILED: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

function MetricCard({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className={`text-2xl font-serif ${color || 'text-foreground'}`}>{value}</p>
      <p className="text-muted-foreground text-xs mt-1">{label}</p>
    </div>
  );
}

export default function TransactionsPage() {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (methodFilter) params.set('method', methodFilter);
    if (statusFilter) params.set('status', statusFilter);
    const qs = params.toString();

    apiFetch<TransactionsResponse>(`/admin/transactions${qs ? `?${qs}` : ''}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [methodFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const methodLabels: Record<string, string> = { PIX: 'Pix', CREDIT_CARD: 'Cartão' };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif text-foreground">Transações</h2>
        <div className="flex gap-3">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary outline-none"
          >
            <option value="">Todos os métodos</option>
            <option value="PIX">Pix</option>
            <option value="CREDIT_CARD">Cartão</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary outline-none"
          >
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="PAID">Pago</option>
            <option value="REFUNDED">Estornado</option>
            <option value="FAILED">Falhou</option>
          </select>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MetricCard value={`R$ ${(data.totals.gross / 100).toFixed(2)}`} label="Total Bruto" />
          <MetricCard value={`R$ ${(data.totals.commission / 100).toFixed(2)}`} label="Comissão" color="text-primary" />
          <MetricCard value={`R$ ${(data.totals.net / 100).toFixed(2)}`} label="Repasse" color="text-green-500" />
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <p className="p-10 text-center text-muted-foreground">Carregando...</p>
        ) : !data || data.payments.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Nenhuma transação encontrada</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comprador</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendedor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Método</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comissão</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold font-mono text-foreground">{tx.orderCode}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{tx.buyerName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{tx.storeName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{methodLabels[tx.method] || tx.method}</td>
                  <td className="px-4 py-3 text-sm text-foreground">R$ {((tx.grossAmount || 0) / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-primary">R$ {((tx.commission || 0) / 100).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
