'use client';

import { useState, useEffect } from 'react';
import { useMyStore, useCreateStore, useUpdateStore, useToggleStoreOpen } from '@/hooks/useStores';
import { toast } from '@/components/common/toast';

export default function SellerStorePage() {
  const { data: store, isLoading } = useMyStore();
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const toggleOpen = useToggleStoreOpen();

  const [form, setForm] = useState({
    name: '', description: '', whatsapp: '', pixKey: '', imageUrl: '', openTime: '', closeTime: '',
  });

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name,
        description: store.description,
        whatsapp: store.whatsapp,
        pixKey: store.pixKey,
        imageUrl: store.imageUrl || '',
        openTime: store.openTime || '',
        closeTime: store.closeTime || '',
      });
    }
  }, [store]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (store) {
        await updateStore.mutateAsync({ id: store.id, ...form });
        toast({ title: 'Loja atualizada!', variant: 'success' });
      } else {
        await createStore.mutateAsync(form);
        toast({ title: 'Loja criada!', variant: 'success' });
      }
    } catch (err: any) {
      toast({ title: err?.message || 'Erro', variant: 'error' });
    }
  }

  const inputClass = 'w-full h-11 bg-surface-2 border border-border rounded-xl px-3 text-text placeholder:text-text-muted focus:border-primary outline-none text-sm';
  const isPending = createStore.isPending || updateStore.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-serif text-text mb-6">Configurar Loja</h1>

      {store && (
        <div className="flex items-center justify-between bg-surface rounded-xl border border-border p-4 mb-6">
          <div>
            <p className="text-sm text-text-secondary">Status da loja</p>
            <p className={`text-sm font-bold ${store.isOpen ? 'text-success' : 'text-error'}`}>
              {store.isOpen ? 'Aberta' : 'Fechada'}
            </p>
          </div>
          <button
            onClick={() => toggleOpen.mutate(store.id)}
            disabled={toggleOpen.isPending}
            className={`relative w-12 h-6 rounded-full transition-colors ${store.isOpen ? 'bg-success' : 'bg-surface-2 border border-border'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${store.isOpen ? 'left-[26px]' : 'left-0.5'}`} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nome da loja *</label>
          <input className={inputClass} placeholder="Minha Loja" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Descrição *</label>
          <textarea className={`${inputClass} h-20 py-2 resize-none`} placeholder="Descreva sua loja..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">WhatsApp *</label>
          <input className={inputClass} placeholder="21999999999" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Chave Pix *</label>
          <input className={inputClass} placeholder="CPF, email ou chave aleatória" value={form.pixKey} onChange={(e) => setForm({ ...form, pixKey: e.target.value })} required disabled={!!store} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">URL da Imagem</label>
          <input className={inputClass} placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Abertura</label>
            <input type="time" className={inputClass} value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Fechamento</label>
            <input type="time" className={inputClass} value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-12 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold shadow-warm hover:shadow-glow transition-all mt-4"
        >
          {isPending ? 'Salvando...' : store ? 'Atualizar loja' : 'Criar loja'}
        </button>
      </form>
    </div>
  );
}
