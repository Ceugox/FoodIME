'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useStores } from '@/hooks/useStores';
import { StoreCardSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import type { Store } from '@/types/models.types';

function StoreCard({ store, index }: { store: Store; index: number }) {
  return (
    <Link href={`/store/${store.id}`}>
      <div
        className="flex items-center gap-0 bg-surface rounded-xl border border-border overflow-hidden mb-3 hover:border-border-hover hover:shadow-warm transition-all active:scale-[0.99] animate-slide-up"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        {store.imageUrl ? (
          <div className="relative w-[88px] h-[88px] min-w-[88px] flex-shrink-0">
            <Image src={store.imageUrl} alt={store.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-[88px] h-[88px] min-w-[88px] flex-shrink-0 bg-primary-dark flex items-center justify-center">
            <span className="text-3xl font-serif text-accent">
              {store.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 p-3 min-w-0">
          <p className="font-serif text-text text-[15px] truncate">{store.name}</p>
          <p className="text-text-secondary text-xs mt-0.5 line-clamp-2 leading-[17px]">{store.description}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-text-muted">
              {store.products?.length || 0} produtos
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              Aberto
            </span>
          </div>
        </div>
        <div className="pr-3">
          <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { data: stores, isLoading, isError, refetch } = useStores();

  return (
    <div className="px-5 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-slide-up">
        <div>
          <h1 className="text-[26px] font-serif text-accent tracking-wide">FoodIME</h1>
          <p className="text-text-secondary text-[13px] mt-0.5">Vendedores abertos agora</p>
        </div>
        <div className="h-10 w-[74px] rounded-xl overflow-hidden border border-border flex items-center justify-center bg-surface">
          <Image src="/logo.png" alt="FoodIME" width={74} height={40} className="object-contain w-full h-full" />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <StoreCardSkeleton key={i} />)
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !stores?.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 animate-scale-in">
          <svg className="w-12 h-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z" />
          </svg>
          <p className="text-text-secondary font-semibold text-base">Nenhum vendedor aberto</p>
          <p className="text-text-muted text-sm">Volte mais tarde</p>
        </div>
      ) : (
        stores.map((store, i) => <StoreCard key={store.id} store={store} index={i} />)
      )}
    </div>
  );
}
