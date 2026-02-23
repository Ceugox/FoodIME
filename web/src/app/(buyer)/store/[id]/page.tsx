'use client';
import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/hooks/useStores';
import { useCartStore } from '@/store/cartStore';
import { ProductCardSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { StockBadge } from '@/components/common/StockBadge';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/models.types';

function ProductCard({ product, storeName }: { product: Product; storeName: string }) {
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const qty = items.find((i) => i.product.id === product.id)?.quantity || 0;
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const unavailable = !product.isAvailable || product.stockQty === 0;

  return (
    <div className={`bg-surface rounded-2xl border border-border overflow-hidden ${unavailable ? 'opacity-60' : ''}`}>
      <div className="relative h-36 bg-surface-2">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-bold text-text text-sm">{product.name}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-accent font-bold">{formatCurrency(product.price)}</p>
          <StockBadge stockQty={product.stockQty} isAvailable={product.isAvailable} />
        </div>
        {!unavailable && (
          qty === 0 ? (
            <button
              onClick={() => addItem(product, storeName)}
              className="mt-2 w-full h-9 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Adicionar
            </button>
          ) : (
            <div className="mt-2 flex items-center justify-between bg-surface-2 rounded-xl px-1">
              <button
                onClick={() => updateQuantity(product.id, qty - 1)}
                className="w-9 h-9 flex items-center justify-center text-accent font-bold text-lg"
              >
                −
              </button>
              <span className="text-text font-semibold text-sm">{qty}</span>
              <button
                onClick={() => addItem(product, storeName)}
                className="w-9 h-9 flex items-center justify-center text-accent font-bold text-lg"
              >
                +
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: store, isLoading, isError, refetch } = useStore(id);
  const itemCount = useCartStore((s) => s.getItemCount());
  const cartTotal = useCartStore((s) => s.getTotal());
  const cartStoreId = useCartStore((s) => s.storeId);
  const showCartBar = itemCount > 0 && cartStoreId === id;

  return (
    <div className="px-5 pt-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border">
          <svg className="w-4 h-4 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        {isLoading ? (
          <div className="h-6 w-40 bg-surface-2 rounded animate-shimmer" />
        ) : (
          <h1 className="text-lg font-bold text-text">{store?.name}</h1>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          {store?.description && (
            <p className="text-text-secondary text-sm mb-4">{store.description}</p>
          )}
          {!store?.products?.length ? (
            <div className="text-center py-16 text-text-secondary">
              Nenhum produto disponível
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {store.products.map((product) => (
                <ProductCard key={product.id} product={product} storeName={store.name} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Floating cart bar */}
      {showCartBar && (
        <div className="fixed bottom-20 left-0 right-0 px-5 z-40">
          <Link href="/cart">
            <div className="max-w-2xl mx-auto bg-primary rounded-2xl p-4 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
                <span className="text-white font-semibold text-sm">Ver carrinho</span>
              </div>
              <span className="text-white font-bold">{formatCurrency(cartTotal)}</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
