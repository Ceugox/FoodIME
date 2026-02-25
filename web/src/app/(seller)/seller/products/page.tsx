'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useMyStore } from '@/hooks/useStores';
import { useProducts, useCreateProduct, useUpdateStock, useRemoveProduct } from '@/hooks/useProducts';
import { ErrorState } from '@/components/common/ErrorState';
import { StockBadge } from '@/components/common/StockBadge';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/models.types';

function ProductCard({ product }: { product: Product }) {
  const updateStock = useUpdateStock();
  const remove = useRemoveProduct();
  const [removing, setRemoving] = useState(false);

  function changeStock(delta: number) {
    const next = Math.max(0, product.stockQty + delta);
    updateStock.mutate({ id: product.id, stockQty: next });
  }

  function handleRemove() {
    setRemoving(true);
  }

  return (
    <>
      <div className="bg-surface rounded-xl border border-border p-3 flex items-center gap-3 mb-2 hover:border-border-hover transition-all">
        {/* Image */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-surface-2 flex-shrink-0">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="h-full flex items-center justify-center text-text-muted text-lg font-serif">
              {product.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text text-sm truncate">{product.name}</p>
          <p className="text-primary font-serif text-sm">{formatCurrency(product.price)}</p>
          <StockBadge stockQty={product.stockQty} isAvailable={product.isAvailable} />
        </div>

        {/* Stock controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => changeStock(-1)}
            disabled={product.stockQty === 0 || updateStock.isPending}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-2 border border-border text-text disabled:opacity-40 font-bold text-base"
          >
            −
          </button>
          <span className="text-text font-semibold text-sm w-6 text-center">
            {product.stockQty}
          </span>
          <button
            onClick={() => changeStock(1)}
            disabled={updateStock.isPending}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-2 border border-border text-text font-bold text-base"
          >
            +
          </button>
          <button
            onClick={handleRemove}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-error ml-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Confirm remove dialog */}
      {removing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-8">
          <div className="w-full max-w-sm bg-surface rounded-xl p-6 border border-border animate-slide-up shadow-warm-lg">
            <h3 className="text-text font-serif text-lg mb-1">Remover produto</h3>
            <p className="text-text-secondary text-sm mb-5">
              Deseja remover <span className="text-primary font-semibold">"{product.name}"</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRemoving(false)} className="flex-1 h-11 rounded-xl border border-border text-text-secondary text-sm font-semibold hover:border-border-hover transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => { remove.mutate(product.id); setRemoving(false); }}
                disabled={remove.isPending}
                className="flex-1 h-11 rounded-xl bg-error text-white text-sm font-bold disabled:opacity-60"
              >
                {remove.isPending ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', price: '', stockQty: '', imageUrl: '' });
  const [error, setError] = useState('');
  const create = useCreateProduct();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.price || !form.stockQty) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      await create.mutateAsync({
        name: form.name,
        price: parseFloat(form.price),
        stockQty: parseInt(form.stockQty),
        imageUrl: form.imageUrl || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao criar produto');
    }
  }

  const inputClass = 'w-full h-11 bg-surface-2 border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-0">
      <div className="w-full max-w-lg bg-surface rounded-t-2xl p-6 pb-10 border-t border-border animate-slide-up shadow-warm-lg">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
        <h3 className="text-text font-serif text-xl mb-5 text-center">Novo produto</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nome *</label>
            <input className={inputClass} placeholder="Ex: Brigadeiro" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Preço (R$) *</label>
            <input className={inputClass} type="number" step="0.01" placeholder="5.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Estoque *</label>
            <input className={inputClass} type="number" placeholder="50" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">URL da imagem</label>
            <input className={inputClass} placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>

          {error && <p className="text-error text-xs bg-error/10 border border-error/30 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl border border-border text-text-secondary font-semibold hover:border-border-hover transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={create.isPending} className="flex-1 h-12 rounded-xl bg-primary text-white font-bold disabled:opacity-60 shadow-warm hover:shadow-glow transition-all">
              {create.isPending ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SellerProductsPage() {
  const [showModal, setShowModal] = useState(false);
  const { data: store, isLoading: storeLoading } = useMyStore();
  const { data: products, isLoading, isError, refetch } = useProducts(store?.id ?? '');

  return (
    <div className="px-5 pt-4 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-serif text-text">Produtos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary-light shadow-glow animate-warm-pulse transition-all"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {storeLoading || isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[72px] bg-surface rounded-xl border border-border mb-2 animate-shimmer" />
        ))
      ) : !store ? (
        <div className="text-center py-16">
          <p className="text-text-secondary font-semibold">Configure sua loja primeiro</p>
          <p className="text-text-muted text-sm mt-1">Acesse a aba "Loja" para criar sua loja</p>
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !products?.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 animate-scale-in">
          <svg className="w-12 h-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
          </svg>
          <p className="text-text-secondary font-semibold">Nenhum produto cadastrado</p>
          <button onClick={() => setShowModal(true)} className="text-primary text-sm font-semibold underline">
            Adicionar primeiro produto
          </button>
        </div>
      ) : (
        products.map((p) => <ProductCard key={p.id} product={p} />)
      )}

      {showModal && <CreateModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
