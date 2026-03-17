'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { apiFetch } from '@/lib/api';

interface Store {
  id: string;
  name: string;
  description: string;
  commissionRate: number;
  isOpen: boolean;
  whatsapp: string;
  pixKey: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

function OpenBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
        isOpen
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
          : 'bg-red-100 text-red-700 border-red-200'
      }`}
    >
      {isOpen ? 'Aberta' : 'Fechada'}
    </span>
  );
}

function CommissionModal({
  open,
  storeName,
  currentRate,
  onSave,
  onCancel,
  loading,
}: {
  open: boolean;
  storeName: string;
  currentRate: number;
  onSave: (rate: number) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [rate, setRate] = useState('');

  useEffect(() => {
    if (open) {
      setRate(String(Math.round(currentRate * 100)));
    }
  }, [open, currentRate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground mb-2">Editar Comissao</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Alterar a taxa de comissao da loja <strong>{storeName}</strong>.
        </p>
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            Taxa de comissao (%)
          </label>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            min="0"
            max="30"
            step="1"
            placeholder="10"
            className="w-full h-10 rounded-lg border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
          />
          <p className="text-xs text-muted-foreground mt-1">Entre 0% e 30%</p>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-input hover:bg-muted/50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(parseFloat(rate) / 100)}
            disabled={loading || !rate}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-white font-semibold disabled:opacity-50 hover:bg-primary-light transition-colors"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Store | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchStores = useCallback(() => {
    setLoading(true);
    apiFetch<Store[]>('/admin/stores')
      .then(setStores)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  async function handleSaveCommission(rate: number) {
    if (!editTarget) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/stores/${editTarget.id}/commission`, {
        method: 'PATCH',
        body: JSON.stringify({ commissionRate: rate }),
      });
      setEditTarget(null);
      fetchStores();
    } catch {
      // error handling
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-serif text-foreground">Lojas</h2>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <p className="p-10 text-center text-muted-foreground">Carregando...</p>
        ) : stores.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Nenhuma loja cadastrada</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loja</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dono</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comissao</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr
                  key={store.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{store.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{store.description}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-foreground">{store.owner.name}</p>
                      <p className="text-xs text-muted-foreground">{store.owner.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground font-semibold">
                    {Math.round(Number(store.commissionRate) * 100)}%
                  </td>
                  <td className="px-4 py-3">
                    <OpenBadge isOpen={store.isOpen} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {store.whatsapp}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditTarget(store)}
                      className="px-3 py-1 text-xs font-semibold rounded-lg border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
                    >
                      Editar comissao
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CommissionModal
        open={!!editTarget}
        storeName={editTarget?.name || ''}
        currentRate={editTarget ? Number(editTarget.commissionRate) : 0.1}
        onSave={handleSaveCommission}
        onCancel={() => setEditTarget(null)}
        loading={saving}
      />
    </AdminLayout>
  );
}
