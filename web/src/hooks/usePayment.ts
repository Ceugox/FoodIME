'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { paymentService } from '@/services/payment.service';
import type { InitiatePaymentResponse } from '@/types/models.types';

export function useInitiatePayment() {
  return useMutation<InitiatePaymentResponse, Error, Parameters<typeof paymentService.initiate>[0]>({
    mutationFn: paymentService.initiate,
  });
}

export function usePaymentByOrder(orderId: string, enabled = true) {
  return useQuery({
    queryKey: ['payments', orderId],
    queryFn: () => paymentService.getByOrder(orderId),
    enabled: !!orderId && enabled,
    refetchInterval: 3_000,
  });
}
