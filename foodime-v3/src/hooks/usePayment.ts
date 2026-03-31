'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// PIX response:  { data: { gatewayTxId, method, pixCopiaECola, qrCodeBase64 } }
// Card response: { data: { gatewayTxId, method, status } }
export function useInitiatePayment() {
  return useMutation({
    mutationFn: (data: { orderId: string; method: 'PIX' | 'CREDIT_CARD'; cardHash?: string }) =>
      api<any>('/api/payments/initiate', { method: 'POST', body: JSON.stringify(data) }),
  });
}

export function useSyncPayment() {
  return useMutation({
    mutationFn: (data: { orderId: string; paymentId: string }) =>
      api<any>('/api/payments/sync', { method: 'POST', body: JSON.stringify(data) }),
  });
}

export function usePaymentByOrder(orderId: string, enabled = true) {
  return useQuery({
    queryKey: ['payment', orderId],
    queryFn: () => api<any>(`/api/payments/order/${orderId}`),
    enabled,
    refetchInterval: 3000,
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (code: string) =>
      api<any>('/api/coupons/validate', { method: 'POST', body: JSON.stringify({ code }) }),
  });
}
