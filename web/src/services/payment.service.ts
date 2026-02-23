import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { Payment, InitiatePaymentResponse } from '@/types/models.types';

interface InitiatePaymentParams {
  orderId: string;
  method: 'PIX' | 'CREDIT_CARD';
  cardToken?: string;
}

export const paymentService = {
  initiate: (params: InitiatePaymentParams) =>
    api.post<ApiResponse<InitiatePaymentResponse>>('/payments/initiate', params).then((r) => r.data.data),

  getByOrder: (orderId: string) =>
    api.get<ApiResponse<Payment>>(`/payments/order/${orderId}`).then((r) => r.data.data),
};
