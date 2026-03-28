'use client';

import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/hooks/useStores';
import { useCartStore } from '@/store/cartStore';
import { StockBadge } from '@/components/common/stock-badge';
import { ProductCardSkeleton } from '@/components/common/loading-skeleton';
import { ErrorState } from '@/components/common/error-state';

export default function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: store, isLoading, isError, refetch } = useStore(id);
  const { items, addItem, removeItem, getTotal, getItemCount } = useCartStore();

  if (isLoading) {
    return (
      <div className="px-4 pt-6">
        <div className="grid grid-cols-2 gap-3 mt-6">
          {[1, 2, 3, 4].map((i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (isError || !store) return <ErrorState message="Loja não encontrada" onRetry={refetch} />;

  const cartCount = getItemCount();
  const cartTotal = getTotal();

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/home" className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border">
          <svg className="w-4 h-4 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-text">{store.name}</h1>
          <p className="text-text-muted text-xs">{store.description}</p>
        </div>
      </div>

      {store.imageUrl && (
        <div className="relative h-40 w-full rounded-2xl overflow-hidden mb-4">
          <Image src={store.imageUrl} alt={store.name} fill className="object-cover" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 animate-stagger">
        {store.products?.map((product, i) => {
          const inCart = items.find((it) => it.product.id === product.id);
          const qty = inCart?.quantity || 0;

          return (
            <div
              key={product.id}
              className={`bg-surface rounded-xl border border-border p-3 stagger-${i + 1} animate-slide-up`}
            >
              {product.imageUrl && (
                <div className="relative h-24 w-full rounded-lg overflow-hidden mb-2">
                  <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                </div>
              )}
              <div className="flex items-center gap-1 mb-1">
                <h3 className="text-sm font-semibold text-text truncate">{product.name}</h3>
                <StockBadge stockQty={product.stockQty} />
              </div>
              <p className="text-primary font-bold text-sm mb-2">
                R$ {Number(product.price).toFixed(2)}
              </p>

              {product.stockQty > 0 && product.isAvailable ? (
                <div className="flex items-center justify-between">
                  {qty > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => qty === 1 ? removeItem(product.id) : useCartStore.getState().updateQuantity(product.id, qty - 1)}
                        className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-secondary hover:border-primary transition-colors"
                      >
                        −
                      </button>
                      <span className="text-sm font-bold text-text w-5 text-center">{qty}</span>
                      <button
                        onClick={() => addItem(product, store.name)}
                        className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-light transition-colors"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addItem(product, store.name)}
                      className="w-full h-8 rounded-lg bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors"
                    >
                      Adicionar
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-error text-xs font-semibold">Indisponível</p>
              )}
            </div>
          );
        })}
      </div>

      {cartCount > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto bg-primary text-white rounded-2xl h-14 flex items-center justify-between px-6 shadow-glow animate-scale-in z-40"
        >
          <span className="text-sm font-bold">
            {cartCount} {cartCount === 1 ? 'item' : 'itens'}
          </span>
          <span className="text-sm font-bold">R$ {cartTotal.toFixed(2)}</span>
        </Link>
      )}
    </div>
  );
}
