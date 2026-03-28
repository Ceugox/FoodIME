'use client';

import { useState } from 'react';
import { useAdminTransactions } from '@/hooks/useAdmin';
import { ErrorState } from '@/components/common/error-state';

const METHOD_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CREDIT_CARD', label: 'Cartão' },
];

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'PAID', label: 'Pago' },
  { value: 'PROCESSING', label: 'Processando' },
  { value: 'REFUNDED', label: 'Estornado' },
  { value: 'FAILED', label: 'Falhou' },
];

export default function AdminTransactionsPage() {
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useAdminTransactions({
    method: method || undefined,
    status: status || undefined,
    page,
  });

  if (isError) return <ErrorState message="Erro ao carregar transações" onRetry={refetch} />;

  const payments = data?.data || [];
  const meta = data?.meta;
  const agg = data?.aggregates;

  const statusColor: Record<string, string> = {
    PAID: 'bg-success/20 text-success',
    PROCESSING: 'bg-accent/20 text-accent',
    REFUNDED: 'bg-blue-500/20 text-blue-400',
    FAILED: 'bg-error/20 text-error',
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-serif text-text mb-6">Transações</h1>

      {/* Aggregates */}
      {agg && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-surface rounded-xl border border-border p-4 text-center">
            <p className="text-[10px] text-text-muted uppercase">Bruto</p>
            <p className="text-sm font-bold text-text">R$ {agg.grossTotal.toFixed(2)}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4 text-center">
            <p className="text-[10px] text-text-muted uppercase">Comissão</p>
            <p className="text-sm font-bold text-accent">R$ {agg.commissionTotal.toFixed(2)}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4 text-center">
            <p className="text-[10px] text-text-muted uppercase">Líquido</p>
            <p className="text-sm font-bold text-success">R$ {agg.netTotal.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {METHOD_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setMethod(f.value); setPage(1); }}
            className={`px-3 h-8 rounded-lg text-xs font-semibold ${method === f.value ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'}`}
          >
            {f.label}
          </button>
        ))}
        <div className="w-px bg-border" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatus(f.value); setPage(1); }}
            className={`px-3 h-8 rounded-lg text-xs font-semibold ${status === f.value ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-text-muted text-xs uppercase">Pedido</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Comprador</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Loja</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Método</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Bruto</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Comissão</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Status</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Data</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="p-6 text-center text-text-muted">Carregando...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-text-muted">Nenhuma transação</td></tr>
            ) : (
              payments.map((p: any) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-surface-2/50">
                  <td className="p-3 text-text font-mono text-xs">#{p.order?.code}</td>
                  <td className="p-3 text-text-secondary text-xs">{p.order?.buyer?.name}</td>
                  <td className="p-3 text-text-secondary text-xs">{p.order?.store?.name}</td>
                  <td className="p-3 text-text text-xs">{p.method}</td>
                  <td className="p-3 text-text text-xs">R$ {Number(p.grossAmount).toFixed(2)}</td>
                  <td className="p-3 text-error text-xs">R$ {Number(p.commission).toFixed(2)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[p.status] || ''}`}>{p.status}</span></td>
                  <td className="p-3 text-text-muted text-xs">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: meta.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-bold ${p === page ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
