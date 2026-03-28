'use client';

import { useState } from 'react';
import { useAdminStores, useUpdateCommission } from '@/hooks/useAdmin';
import { toast } from '@/components/common/toast';
import { ErrorState } from '@/components/common/error-state';

export default function AdminStoresPage() {
  const { data, isLoading, isError, refetch } = useAdminStores();
  const updateCommission = useUpdateCommission();
  const [editing, setEditing] = useState<{ id: string; name: string; rate: string } | null>(null);

  const stores = data?.data || [];

  async function handleSaveCommission() {
    if (!editing) return;
    const rate = parseFloat(editing.rate) / 100;
    if (isNaN(rate) || rate < 0 || rate > 0.3) {
      toast({ title: 'Comissão deve ser entre 0% e 30%', variant: 'error' });
      return;
    }
    try {
      await updateCommission.mutateAsync({ storeId: editing.id, commissionRate: rate });
      toast({ title: 'Comissão atualizada', variant: 'success' });
      setEditing(null);
    } catch (err: any) {
      toast({ title: err?.message || 'Erro', variant: 'error' });
    }
  }

  if (isError) return <ErrorState message="Erro ao carregar lojas" onRetry={refetch} />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-serif text-text mb-6">Lojas</h1>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-text-muted text-xs uppercase">Loja</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Dono</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Comissão</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Status</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-6 text-center text-text-muted">Carregando...</td></tr>
            ) : stores.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-text-muted">Nenhuma loja</td></tr>
            ) : (
              stores.map((s: any) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-surface-2/50">
                  <td className="p-3 text-text font-medium">{s.name}</td>
                  <td className="p-3 text-text-secondary">{s.owner?.name}</td>
                  <td className="p-3 text-text">{(Number(s.commissionRate) * 100).toFixed(0)}%</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.isOpen ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
                      {s.isOpen ? 'Aberta' : 'Fechada'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setEditing({ id: s.id, name: s.name, rate: String((Number(s.commissionRate) * 100).toFixed(0)) })}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      Editar comissão
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Commission Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6" onClick={() => setEditing(null)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text mb-2">Comissão — {editing.name}</h3>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="number"
                min={0}
                max={30}
                value={editing.rate}
                onChange={(e) => setEditing({ ...editing, rate: e.target.value })}
                className="w-24 h-10 bg-background border border-border rounded-xl px-4 text-text text-sm focus:border-primary focus:outline-none"
              />
              <span className="text-text-secondary text-sm">%</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 h-10 bg-surface-2 border border-border rounded-xl text-text-secondary font-semibold text-sm">Cancelar</button>
              <button onClick={handleSaveCommission} disabled={updateCommission.isPending} className="flex-1 h-10 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-60">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
