'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { apiFetch } from '@/lib/api';

interface PayoutOverview {
  storeId: string;
  storeName: string;
  sellerName: string;
  totalEarned: number;
  totalPaid: number;
  balance: number;
}

interface Payout {
  id: string;
  storeId: string;
  amount: number;
  note?: string;
  createdAt: string;
}

function fmt(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function HistoryModal({
  store,
  onClose,
}: {
  store: PayoutOverview;
  onClose: () => void;
}) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Payout[]>(`/admin/payouts/${store.storeId}`)
      .then(setPayouts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [store.storeId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-card rounded-xl border border-border p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-serif text-foreground text-lg">{store.storeName}</h3>
            <p className="text-muted-foreground text-sm">{store.sellerName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-background rounded-lg border border-border p-3">
            <p className="text-foreground font-semibold text-sm">{fmt(store.totalEarned)}</p>
            <p className="text-muted-foreground text-xs mt-0.5">Total ganho</p>
          </div>
          <div className="bg-background rounded-lg border border-border p-3">
            <p className="text-green-500 font-semibold text-sm">{fmt(store.totalPaid)}</p>
            <p className="text-muted-foreground text-xs mt-0.5">Total repassado</p>
          </div>
          <div className="bg-background rounded-lg border border-border p-3">
            <p className={`font-semibold text-sm ${store.balance > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
              {fmt(store.balance)}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">Saldo devedor</p>
          </div>
        </div>

        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Histórico de repasses</p>

        {loading ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Carregando...</p>
        ) : payouts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Nenhum repasse registrado</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-background rounded-lg border border-border px-4 py-2.5">
                <div>
                  <p className="text-foreground text-sm font-semibold">{fmt(p.amount)}</p>
                  {p.note && <p className="text-muted-foreground text-xs">{p.note}</p>}
                </div>
                <p className="text-muted-foreground text-xs">
                  {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RegisterModal({
  store,
  onClose,
  onSuccess,
}: {
  store: PayoutOverview;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount.replace(',', '.'));
    if (!value || value <= 0) {
      setError('Informe um valor válido');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiFetch('/admin/payouts', {
        method: 'POST',
        body: JSON.stringify({
          storeId: store.storeId,
          amount: Math.round(value * 100),
          note: note || undefined,
        }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Falha ao registrar repasse');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full h-10 bg-background border border-input rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-card rounded-xl border border-border p-6 shadow-xl">
        <h3 className="font-serif text-foreground text-lg mb-1">Registrar repasse</h3>
        <p className="text-muted-foreground text-sm mb-5">
          Para <span className="text-foreground font-semibold">{store.storeName}</span>
          {' '}— saldo devedor: <span className="text-yellow-500 font-semibold">{fmt(store.balance)}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Valor (R$) *
            </label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Observação
            </label>
            <input
              className={inputClass}
              placeholder="Ex: Pix para chave CPF 000..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-input text-muted-foreground text-sm font-semibold hover:bg-muted/30 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-60 transition-colors"
            >
              {loading ? 'Registrando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  const [overview, setOverview] = useState<PayoutOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerStore, setRegisterStore] = useState<PayoutOverview | null>(null);
  const [historyStore, setHistoryStore] = useState<PayoutOverview | null>(null);

  const fetchOverview = useCallback(() => {
    setLoading(true);
    apiFetch<PayoutOverview[]>('/admin/payouts')
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const totalBalance = overview.reduce((s, o) => s + o.balance, 0);
  const totalEarned = overview.reduce((s, o) => s + o.totalEarned, 0);
  const totalPaid = overview.reduce((s, o) => s + o.totalPaid, 0);

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif text-foreground">Repasses</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-serif text-foreground">{fmt(totalEarned)}</p>
          <p className="text-muted-foreground text-xs mt-1">Total gerado (net)</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-serif text-green-500">{fmt(totalPaid)}</p>
          <p className="text-muted-foreground text-xs mt-1">Total repassado</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-2xl font-serif text-yellow-500">{fmt(totalBalance)}</p>
          <p className="text-muted-foreground text-xs mt-1">Saldo devedor total</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <p className="p-10 text-center text-muted-foreground">Carregando...</p>
        ) : overview.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Nenhum vendedor encontrado</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loja</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendedor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total ganho</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Repassado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo devedor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {overview.map((row) => (
                <tr key={row.storeId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">{row.storeName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.sellerName}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{fmt(row.totalEarned)}</td>
                  <td className="px-4 py-3 text-sm text-green-500">{fmt(row.totalPaid)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${row.balance > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {fmt(row.balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setHistoryStore(row)}
                        className="text-xs px-3 h-7 rounded-lg border border-input text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                      >
                        Histórico
                      </button>
                      {row.balance > 0 && (
                        <button
                          onClick={() => setRegisterStore(row)}
                          className="text-xs px-3 h-7 rounded-lg bg-primary text-white font-semibold hover:bg-primary/80 transition-colors"
                        >
                          Registrar repasse
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {historyStore && (
        <HistoryModal store={historyStore} onClose={() => setHistoryStore(null)} />
      )}

      {registerStore && (
        <RegisterModal
          store={registerStore}
          onClose={() => setRegisterStore(null)}
          onSuccess={() => {
            setRegisterStore(null);
            fetchOverview();
          }}
        />
      )}
    </AdminLayout>
  );
}
