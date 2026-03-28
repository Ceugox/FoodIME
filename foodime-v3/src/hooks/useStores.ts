'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Store } from '@/types';

export function useStores(search?: string) {
  return useQuery({
    queryKey: ['stores', search],
    queryFn: () => api<{ data: Store[] }>(`/api/stores${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    select: (res) => res.data,
  });
}

export function useStore(id: string) {
  return useQuery({
    queryKey: ['stores', id],
    queryFn: () => api<{ data: Store }>(`/api/stores/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useMyStore() {
  return useQuery({
    queryKey: ['stores', 'me'],
    queryFn: () => api<{ data: Store | null }>('/api/stores/me'),
    select: (res) => res.data,
  });
}

export function useCreateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api<{ data: Store }>('/api/stores', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
}

export function useUpdateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api<{ data: Store }>(`/api/stores/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
}

export function useToggleStoreOpen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ data: Store }>(`/api/stores/${id}/toggle-open`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
}
