import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { Store } from '@/types/models.types';

interface CreateStoreParams {
  name: string;
  description: string;
  imageUrl?: string;
  whatsapp: string;
  pixKey: string;
}

export const storeService = {
  getAll: (search?: string) =>
    api
      .get<ApiResponse<Store[]>>('/stores', { params: search ? { search } : undefined })
      .then((r) => r.data.data),

  getById: (id: string) =>
    api.get<ApiResponse<Store>>(`/stores/${id}`).then((r) => r.data.data),

  getMyStore: () =>
    api.get<ApiResponse<Store>>('/stores/mine').then((r) => r.data.data),

  create: (params: CreateStoreParams) =>
    api.post<ApiResponse<Store>>('/stores', params).then((r) => r.data.data),

  update: (id: string, params: Partial<CreateStoreParams>) =>
    api.patch<ApiResponse<Store>>(`/stores/${id}`, params).then((r) => r.data.data),

  toggleOpen: (id: string) =>
    api.post<ApiResponse<Store>>(`/stores/${id}/toggle-open`).then((r) => r.data.data),
};
