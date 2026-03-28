'use client';

import { useState } from 'react';
import { usePayoutOverview, useCreatePayout, useStorePayouts } from '@/hooks/useAdmin';
import { toast } from '@/components/common/toast';
import { ErrorState } from '@/components/common/error-state';

export default function AdminPayoutsPage() {
  const { data, isLoading, isError, refetch } = usePayoutOverview();
  const createPayout = useCreatePayout();
  const [payoutForm, setPayoutForm] = useState<{ storeId: string; storeName: string; balance: number } | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [historyStoreId, setHistoryStoreId] = useState<string | null>(null);

  const stores = data?.data || [];
  const totals = data?.totals;

  async function handleCreatePayout() {
    if (!payoutForm || !amount) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast({ title: 'Valor inválido', variant: 'error' });
      return;
    }
    try {
      await createPayout.mutateAsync({ storeId: payoutForm.storeId, amount: val, note: note || undefined });
      toast({ title: 'Repasse registrado', variant: 'success' });
      setPayoutForm(null);
      setAmount('');
      setNote('');
    } catch (err: any) {
      toast({ title: err?.message || 'Erro', variant: 'error' });
    }
  }

  if (isError) return <ErrorState message="Erro ao carregar repasses" onRetry={refetch} />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-serif text-text mb-6">Repasses</h1>

      {/* Summary */}
      {totals && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface rounded-xl border border-border p-4 text-center">
            <p className="text-[10px] text-text-muted uppercase">Total ganho</p>
            <p className="text-sm font-bold text-text">R$ {totals.earned.toFixed(2)}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4 text-center">
            <p className="text-[10px] text-text-muted uppercase">Total pago</p>
            <p className="text-sm font-bold text-success">R$ {totals.paid.toFixed(2)}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4 text-center">
            <p className="text-[10px] text-text-muted uppercase">Saldo devedor</p>
            <p className="text-sm font-bold text-accent">R$ {totals.balance.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Stores Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-text-muted text-xs uppercase">Loja</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Dono</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Ganhos</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Pago</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Saldo</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-6 text-center text-text-muted">Carregando...</td></tr>
            ) : stores.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-text-muted">Nenhuma loja</td></tr>
            ) : (
              stores.map((s: any) => (
                <tr key={s.storeId} className="border-b border-border/50 hover:bg-surface-2/50">
                  <td className="p-3 text-text font-medium">{s.storeName}</td>
                  <td className="p-3 text-text-secondary">{s.ownerName}</td>
                  <td className="p-3 text-text">R$ {s.totalEarned.toFixed(2)}</td>
                  <td className="p-3 text-success">R$ {s.totalPaid.toFixed(2)}</td>
                  <td className="p-3 text-accent font-bold">R$ {s.balance.toFixed(2)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => setHistoryStoreId(s.storeId)} className="text-[10px] text-primary font-bold hover:underline">Histórico</button>
                      {s.balance > 0 && (
                        <button
                          onClick={() => setPayoutForm({ storeId: s.storeId, storeName: s.storeName, balance: s.balance })}
                          className="text-[10px] text-success font-bold hover:underline"
                        >
                          Pagar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payout Form Modal */}
      {payoutForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6" onClick={() => setPayoutForm(null)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text mb-1">Registrar repasse</h3>
            <p className="text-text-muted text-sm mb-4">{payoutForm.storeName} — Saldo: R$ {payoutForm.balance.toFixed(2)}</p>
            <div className="space-y-3 mb-4">
              <input
                type="number"
                placeholder="Valor"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-10 bg-background border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                placeholder="Observação (opcional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-10 bg-background border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPayoutForm(null)} className="flex-1 h-10 bg-surface-2 border border-border rounded-xl text-text-secondary font-semibold text-sm">Cancelar</button>
              <button onClick={handleCreatePayout} disabled={createPayout.isPending} className="flex-1 h-10 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-60">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyStoreId && <PayoutHistoryModal storeId={historyStoreId} onClose={() => setHistoryStoreId(null)} />}
    </div>
  );
}

function PayoutHistoryModal({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const { data, isLoading } = useStorePayouts(storeId);
  const payouts = data?.data || [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="bg-surface rounded-2xl p-6 w-full max-w-md max-h-[70vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-text mb-4">Histórico de repasses</h3>
        {isLoading ? (
          <p className="text-text-muted text-sm text-center py-6">Carregando...</p>
        ) : payouts.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-6">Nenhum repasse registrado</p>
        ) : (
          <div className="space-y-2">
            {payouts.map((p: any) => (
              <div key={p.id} className="bg-background rounded-xl border border-border p-3">
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-success">R$ {Number(p.amount).toFixed(2)}</span>
                  <span className="text-[10px] text-text-muted">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                {p.note && <p className="text-text-secondary text-xs mt-1">{p.note}</p>}
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="w-full h-10 bg-surface-2 border border-border rounded-xl text-text-secondary font-semibold text-sm mt-4">Fechar</button>
      </div>
    </div>
  );
}
