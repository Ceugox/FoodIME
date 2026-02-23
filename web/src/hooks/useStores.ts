'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeService } from '@/services/store.service';

export function useStores() {
  return useQuery({
    queryKey: ['stores', 'active'],
    queryFn: storeService.getAll,
    staleTime: 30_000,
  });
}

export function useStore(id: string) {
  return useQuery({
    queryKey: ['stores', id],
    queryFn: () => storeService.getById(id),
    enabled: !!id,
  });
}

export function useMyStore() {
  return useQuery({
    queryKey: ['stores', 'mine'],
    queryFn: storeService.getMyStore,
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storeService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string } & Parameters<typeof storeService.update>[1]) =>
      storeService.update(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

export function useToggleStoreOpen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storeService.toggleOpen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}
