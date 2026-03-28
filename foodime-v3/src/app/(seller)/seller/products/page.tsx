'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useMyStore } from '@/hooks/useStores';
import { useProducts, useCreateProduct, useUpdateStock, useRemoveProduct } from '@/hooks/useProducts';
import { StockBadge } from '@/components/common/stock-badge';
import { ErrorState } from '@/components/common/error-state';
import { toast } from '@/components/common/toast';
import { api } from '@/lib/api-client';

export default function SellerProductsPage() {
  const { data: store } = useMyStore();
  const { data: products, isLoading, isError, refetch } = useProducts(store?.id);
  const createProduct = useCreateProduct();
  const updateStock = useUpdateStock();
  const removeProduct = useRemoveProduct();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', stockQty: '', imageUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Imagem deve ter no máximo 5MB', variant: 'error' }); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads/image', { method: 'POST', body: formData, credentials: 'include' });
      const json = await res.json();
      if (res.ok) setForm({ ...form, imageUrl: json.data.url });
      else toast({ title: json.message || 'Erro no upload', variant: 'error' });
    } catch { toast({ title: 'Erro no upload', variant: 'error' }); }
    setUploading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createProduct.mutateAsync({
        name: form.name,
        price: parseFloat(form.price),
        stockQty: parseInt(form.stockQty),
        imageUrl: form.imageUrl || undefined,
      });
      setForm({ name: '', price: '', stockQty: '', imageUrl: '' });
      setShowCreate(false);
      toast({ title: 'Produto criado!', variant: 'success' });
    } catch (err: any) {
      toast({ title: err?.message || 'Erro ao criar produto', variant: 'error' });
    }
  }

  async function handleDelete(id: string) {
    try {
      await removeProduct.mutateAsync(id);
      setDeleteId(null);
      toast({ title: 'Produto removido', variant: 'success' });
    } catch (err: any) {
      toast({ title: err?.message || 'Erro ao remover', variant: 'error' });
    }
  }

  const inputClass = 'w-full h-11 bg-surface-2 border border-border rounded-xl px-3 text-text placeholder:text-text-muted focus:border-primary outline-none text-sm';

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-serif text-text">Produtos</h1>
        <button onClick={() => setShowCreate(true)} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-glow hover:bg-primary-light transition-colors text-xl">
          +
        </button>
      </div>

      {isError && <ErrorState message="Erro ao carregar produtos" onRetry={refetch} />}

      {!store && (
        <div className="text-center py-12">
          <p className="text-text-muted text-sm">Configure sua loja primeiro na aba &quot;Loja&quot;</p>
        </div>
      )}

      <div className="space-y-3">
        {products?.map((product) => (
          <div key={product.id} className="bg-surface rounded-xl border border-border p-3 flex gap-3 animate-slide-up">
            {product.imageUrl && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text truncate">{product.name}</h3>
                <StockBadge stockQty={product.stockQty} />
              </div>
              <p className="text-primary font-bold text-sm">R$ {Number(product.price).toFixed(2)}</p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => updateStock.mutate({ id: product.id, stockQty: Math.max(0, product.stockQty - 1) })}
                  className="w-7 h-7 rounded-lg bg-surface-2 border border-border text-text-secondary flex items-center justify-center text-sm"
                >−</button>
                <span className="text-xs font-bold text-text">{product.stockQty}</span>
                <button
                  onClick={() => updateStock.mutate({ id: product.id, stockQty: product.stockQty + 1 })}
                  className="w-7 h-7 rounded-lg bg-surface-2 border border-border text-text-secondary flex items-center justify-center text-sm"
                >+</button>
                <button
                  onClick={() => setDeleteId(product.id)}
                  className="ml-auto w-7 h-7 rounded-lg bg-error/10 text-error flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-text mb-4">Novo produto</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input className={inputClass} placeholder="Nome do produto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className={inputClass} type="number" step="0.01" placeholder="Preço (R$)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              <input className={inputClass} type="number" placeholder="Quantidade em estoque" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} required />
              <div>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs text-text-muted" />
                {uploading && <p className="text-xs text-text-muted mt-1">Enviando...</p>}
                {form.imageUrl && (
                  <div className="relative h-20 w-20 rounded-lg overflow-hidden mt-2">
                    <Image src={form.imageUrl} alt="Preview" fill className="object-cover" />
                    <button type="button" onClick={() => setForm({ ...form, imageUrl: '' })} className="absolute top-0.5 right-0.5 w-5 h-5 bg-error rounded-full text-white text-xs flex items-center justify-center">×</button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-11 bg-surface-2 border border-border rounded-xl text-text-secondary font-semibold text-sm">Cancelar</button>
                <button type="submit" disabled={createProduct.isPending} className="flex-1 h-11 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-60">
                  {createProduct.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6" onClick={() => setDeleteId(null)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text mb-2">Remover produto?</h3>
            <p className="text-text-secondary text-sm mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 h-11 bg-surface-2 border border-border rounded-xl text-text-secondary font-semibold text-sm">Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 h-11 bg-error text-white rounded-xl font-semibold text-sm">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
