'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Order } from '@/types';

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { storeId: string; items: { productId: string; quantity: number }[] }) =>
      api<{ data: Order }>('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useBuyerOrders(refetchInterval?: number) {
  return useQuery({
    queryKey: ['orders', 'buyer'],
    queryFn: () => api<{ data: Order[] }>('/api/orders/buyer'),
    select: (res) => res.data,
    refetchInterval,
  });
}

export function useSellerOrders() {
  return useQuery({
    queryKey: ['orders', 'seller'],
    queryFn: () => api<{ data: Order[] }>('/api/orders/seller'),
    select: (res) => res.data,
    refetchInterval: 15000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => api<{ data: Order }>(`/api/orders/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

interface SellerMetrics {
  revenue: { today: number; week: number; month: number };
  orders: { today: number; week: number; month: number };
  weeklyChart: { day: string; revenue: number }[];
  topProduct: { name: string; totalSold: number } | null;
  transactions: {
    id: string;
    orderCode: string;
    date: string;
    grossAmount: number;
    commission: number;
    netAmount: number;
    method: string;
  }[];
}

export function useSellerMetrics() {
  return useQuery({
    queryKey: ['orders', 'metrics'],
    queryFn: () => api<{ data: SellerMetrics }>('/api/orders/metrics'),
    select: (res) => res.data,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}
