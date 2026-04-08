'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStores } from '@/hooks/useStores';
import { useAuthStore } from '@/store/authStore';
import { StoreCardSkeleton } from '@/components/common/loading-skeleton';
import { ErrorState } from '@/components/common/error-state';

const CATEGORIES = [
  { label: 'Todos', value: '' },
  { label: 'Lanches', value: 'lanches' },
  { label: 'Bebidas', value: 'bebidas' },
  { label: 'Doces', value: 'doces' },
  { label: 'Refeições', value: 'refeições' },
];

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const user = useAuthStore((s) => s.user);

  const { data: stores, isLoading, isError, refetch } = useStores(debouncedSearch || undefined);

  useMemo(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const firstName = user?.name?.split(' ')[0] || '';

  const filteredStores = useMemo(() => {
    if (!stores || !category) return stores;
    return stores.filter((s) =>
      s.name.toLowerCase().includes(category) ||
      (s.description || '').toLowerCase().includes(category)
    );
  }, [stores, category]);

  return (
    <div className="px-4 pt-6 pb-24">
      {/* Header with greeting */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-text-muted text-xs">Bem-vindo de volta</p>
          <h1 className="text-xl font-serif text-text">Olá, {firstName} 👋</h1>
        </div>
        <button onClick={() => refetch()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border hover:border-border-hover transition-colors">
          <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
        </button>
      </div>

      <p className="text-text-muted text-xs mb-5">O que você quer comer hoje?</p>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar lojas ou produtos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-12 bg-surface border border-border rounded-xl pl-10 pr-4 text-text placeholder:text-text-muted focus:border-primary outline-none text-sm transition-all"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`flex-shrink-0 px-4 h-8 rounded-full text-xs font-semibold transition-all ${
              category === cat.value
                ? 'bg-primary text-white shadow-warm'
                : 'bg-surface border border-border text-text-secondary hover:border-border-hover'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <StoreCardSkeleton key={i} />)}
        </div>
      )}

      {isError && <ErrorState message="Erro ao carregar lojas" onRetry={refetch} />}

      {filteredStores && filteredStores.length === 0 && !isLoading && (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-text-muted text-sm">Nenhuma loja encontrada</p>
        </div>
      )}

      <div className="space-y-3 animate-stagger">
        {filteredStores?.map((store, i) => (
          <Link
            key={store.id}
            href={`/store/${store.id}`}
            className={`block bg-surface rounded-2xl border border-border p-4 hover:border-border-hover transition-all stagger-${i + 1} animate-slide-up`}
          >
            {store.imageUrl && (
              <div className="relative h-32 w-full rounded-xl overflow-hidden mb-3">
                <Image src={store.imageUrl} alt={store.name} fill className="object-cover" />
              </div>
            )}
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-text">{store.name}</h2>
              {store.isOpen ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success/15 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  Aberta agora
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                  Fechada
                </span>
              )}
            </div>
            <p className="text-text-secondary text-xs line-clamp-2">{store.description}</p>
            <p className="text-text-muted text-xs mt-2">
              {store.products?.length || 0} produto{(store.products?.length || 0) !== 1 ? 's' : ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
