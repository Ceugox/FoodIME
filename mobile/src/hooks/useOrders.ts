import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/order.service';

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orderService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useBuyerOrders() {
  return useQuery({
    queryKey: ['orders', 'buyer'],
    queryFn: orderService.getByBuyer,
    staleTime: 15_000,
  });
}

export function useSellerOrders() {
  return useQuery({
    queryKey: ['orders', 'seller'],
    queryFn: orderService.getBySeller,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => orderService.getById(id),
    enabled: !!id,
  });
}

export function useSellerMetrics() {
  return useQuery({
    queryKey: ['orders', 'seller', 'metrics'],
    queryFn: orderService.getSellerMetrics,
    staleTime: 60_000,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      orderService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
