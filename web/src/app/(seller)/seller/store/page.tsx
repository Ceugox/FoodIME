'use client';
import { useState, useEffect } from 'react';
import { useMyStore, useCreateStore, useUpdateStore, useToggleStoreOpen } from '@/hooks/useStores';
import { ErrorState } from '@/components/common/ErrorState';

export default function SellerStorePage() {
  const { data: store, isLoading, isError, refetch } = useMyStore();
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const toggleOpen = useToggleStoreOpen();

  const [form, setForm] = useState({ name: '', description: '', whatsapp: '', pixKey: '', imageUrl: '' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name,
        description: store.description,
        whatsapp: store.whatsapp,
        pixKey: store.pixKey,
        imageUrl: store.imageUrl || '',
      });
    }
  }, [store]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name || !form.description || !form.whatsapp || !form.pixKey) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      const payload = { ...form, imageUrl: form.imageUrl || undefined };
      if (store) {
        await updateStore.mutateAsync({ id: store.id, ...payload });
      } else {
        await createStore.mutateAsync(payload);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar loja');
    }
  }

  const inputClass = 'w-full h-11 bg-surface-2 border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all';
  const isPending = createStore.isPending || updateStore.isPending;

  return (
    <div className="px-5 pt-4 pb-8 animate-slide-up">
      <h1 className="text-2xl font-serif text-text mb-5">
        {store ? 'Configurações da loja' : 'Criar sua loja'}
      </h1>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 bg-surface-2 rounded-xl animate-shimmer" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          {/* Status toggle */}
          {store && (
            <div className="flex items-center justify-between bg-surface rounded-xl border border-border px-4 py-3 mb-5">
              <div>
                <p className="text-text font-serif text-sm">{store.name}</p>
                <p className={`text-xs font-semibold mt-0.5 ${store.isOpen ? 'text-success' : 'text-error'}`}>
                  {store.isOpen ? 'Aberta' : 'Fechada'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-text-secondary text-xs">{store.isOpen ? 'Fechar' : 'Abrir'}</span>
                <button
                  onClick={() => toggleOpen.mutate(store.id)}
                  disabled={toggleOpen.isPending}
                  aria-label="Toggle loja"
                  className={`relative w-12 h-6 rounded-full transition-colors ${store.isOpen ? 'bg-success' : 'bg-border'} disabled:opacity-60`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${store.isOpen ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Nome da loja *
              </label>
              <input className={inputClass} placeholder="Doces da Maria" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Descrição *
              </label>
              <textarea
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text text-sm placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none resize-none transition-all"
                rows={3}
                placeholder="Doces caseiros feitos com amor"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                WhatsApp *
              </label>
              <input className={inputClass} placeholder="(21) 99999-9999" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Chave PIX *
              </label>
              <input
                className={inputClass}
                placeholder="CPF, e-mail ou chave aleatória"
                value={form.pixKey}
                onChange={(e) => setForm({ ...form, pixKey: e.target.value })}
                disabled={!!store}
              />
              {store && (
                <p className="text-text-muted text-[11px] mt-1">A chave PIX não pode ser alterada após criação.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                URL da imagem
              </label>
              <input className={inputClass} placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-error/10 border border-error/30 rounded-xl px-4 py-2.5">
                <svg className="w-4 h-4 text-error flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L3.072 16.5C2.302 18.333 3.264 19 4.804 19z" />
                </svg>
                <p className="text-error text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold shadow-warm hover:shadow-glow transition-all"
            >
              {isPending ? 'Salvando...' : saved ? 'Salvo!' : store ? 'Salvar alterações' : 'Criar loja'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
