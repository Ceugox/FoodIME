'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { apiFetch } from '@/lib/api';

interface Transaction {
  id: string;
  orderId: string;
  orderCode: string;
  method: string;
  status: string;
  amount: number;
  commission: number;
  net: number;
  buyerName: string;
  sellerName: string;
  createdAt: string;
}

interface TransactionsResponse {
  payments: Transaction[];
  totals: { gross: number; commission: number; net: number };
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

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      PENDING: 'badge badge-warning',
      PAID: 'badge badge-success',
      REFUNDED: 'badge badge-error',
      FAILED: 'badge badge-error',
    };
    return <span className={map[status] || 'badge badge-secondary'}>{status}</span>;
  }

  function methodLabel(method: string) {
    const labels: Record<string, string> = { PIX: 'Pix', CREDIT_CARD: 'Cartao' };
    return labels[method] || method;
  }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Transacoes</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
            <option value="">Todos os metodos</option>
            <option value="PIX">Pix</option>
            <option value="CREDIT_CARD">Cartao</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="PAID">Pago</option>
            <option value="REFUNDED">Estornado</option>
            <option value="FAILED">Falhou</option>
          </select>
        </div>
      </div>

      {data && (
        <div className="grid-3" style={{ marginBottom: 24 }}>
          <div className="metric-card">
            <div className="value">R$ {(data.totals.gross / 100).toFixed(2)}</div>
            <div className="label">Total Bruto</div>
          </div>
          <div className="metric-card">
            <div className="value" style={{ color: '#f97316' }}>R$ {(data.totals.commission / 100).toFixed(2)}</div>
            <div className="label">Comissao</div>
          </div>
          <div className="metric-card">
            <div className="value" style={{ color: '#22c55e' }}>R$ {(data.totals.net / 100).toFixed(2)}</div>
            <div className="label">Repasse</div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Carregando...</p>
        ) : !data || data.payments.length === 0 ? (
          <p style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Nenhuma transacao encontrada</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Comprador</th>
                <th>Vendedor</th>
                <th>Metodo</th>
                <th>Valor</th>
                <th>Comissao</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{tx.orderCode}</td>
                  <td>{tx.buyerName}</td>
                  <td>{tx.sellerName}</td>
                  <td>{methodLabel(tx.method)}</td>
                  <td>R$ {(tx.amount / 100).toFixed(2)}</td>
                  <td style={{ color: '#f97316' }}>R$ {(tx.commission / 100).toFixed(2)}</td>
                  <td>{statusBadge(tx.status)}</td>
                  <td>{new Date(tx.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
