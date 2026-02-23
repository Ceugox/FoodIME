import api from './api';
import type { ApiResponse, ApiMessage } from '@/types/api.types';
import type { Product } from '@/types/models.types';

interface CreateProductParams {
  name: string;
  price: number;
  stockQty: number;
  imageUrl?: string;
}

export const productService = {
  getByStore: (storeId: string) =>
    api.get<ApiResponse<Product[]>>('/products', { params: { storeId } }).then((r) => r.data.data),

  getById: (id: string) =>
    api.get<ApiResponse<Product>>(`/products/${id}`).then((r) => r.data.data),

  create: (params: CreateProductParams) =>
    api.post<ApiResponse<Product>>('/products', params).then((r) => r.data.data),

  update: (id: string, params: Partial<CreateProductParams>) =>
    api.patch<ApiResponse<Product>>(`/products/${id}`, params).then((r) => r.data.data),

  remove: (id: string) =>
    api.delete<ApiMessage>(`/products/${id}`).then((r) => r.data),

  updateStock: (id: string, stockQty: number) =>
    api.patch<ApiResponse<Product>>(`/products/${id}/stock`, { stockQty }).then((r) => r.data.data),
};
