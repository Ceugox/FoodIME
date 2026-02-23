import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { Order } from '@/types/models.types';

interface CreateOrderParams {
  storeId: string;
  items: { productId: string; quantity: number }[];
}

export interface SellerMetrics {
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

export const orderService = {
  create: (params: CreateOrderParams) =>
    api.post<ApiResponse<Order>>('/orders', params).then((r) => r.data.data),

  getByBuyer: () =>
    api.get<ApiResponse<Order[]>>('/orders/buyer').then((r) => r.data.data),

  getBySeller: () =>
    api.get<ApiResponse<Order[]>>('/orders/seller').then((r) => r.data.data),

  getById: (id: string) =>
    api.get<ApiResponse<Order>>(`/orders/${id}`).then((r) => r.data.data),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Order>>(`/orders/${id}/status`, { status }).then((r) => r.data.data),

  getSellerMetrics: () =>
    api.get<ApiResponse<SellerMetrics>>('/orders/seller/metrics').then((r) => r.data.data),
};
