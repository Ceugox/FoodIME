'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api<any>('/api/admin/dashboard'),
  });
}

export function useAdminUsers(params?: { role?: string; status?: string; search?: string; page?: number }) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params?.role) sp.set('role', params.role);
      if (params?.status) sp.set('status', params.status);
      if (params?.search) sp.set('search', params.search);
      if (params?.page) sp.set('page', String(params.page));
      return api<any>(`/api/admin/users?${sp.toString()}`);
    },
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => api<any>(`/api/admin/users/${id}`),
    enabled: !!id,
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; status: 'ACTIVE' | 'BLOCKED'; reason?: string }) =>
      api(`/api/admin/users/${data.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: data.status, reason: data.reason }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useSellerDetail(id: string) {
  return useQuery({
    queryKey: ['admin', 'seller', id],
    queryFn: () => api<any>(`/api/admin/sellers/${id}`),
    enabled: !!id,
  });
}

export function useBuyerDetail(id: string) {
  return useQuery({
    queryKey: ['admin', 'buyer', id],
    queryFn: () => api<any>(`/api/admin/buyers/${id}`),
    enabled: !!id,
  });
}

export function useAdminStores() {
  return useQuery({
    queryKey: ['admin', 'stores'],
    queryFn: () => api<any>('/api/admin/stores'),
  });
}

export function useUpdateCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { storeId: string; commissionRate: number }) =>
      api(`/api/admin/stores/${data.storeId}/commission`, { method: 'PATCH', body: JSON.stringify({ commissionRate: data.commissionRate }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'stores'] }),
  });
}

export function useAdminTransactions(params?: { method?: string; status?: string; page?: number }) {
  return useQuery({
    queryKey: ['admin', 'transactions', params],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params?.method) sp.set('method', params.method);
      if (params?.status) sp.set('status', params.status);
      if (params?.page) sp.set('page', String(params.page));
      return api<any>(`/api/admin/transactions?${sp.toString()}`);
    },
  });
}

export function usePayoutOverview() {
  return useQuery({
    queryKey: ['admin', 'payouts'],
    queryFn: () => api<any>('/api/admin/payouts'),
  });
}

export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { storeId: string; amount: number; note?: string }) =>
      api('/api/admin/payouts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'payouts'] }),
  });
}

export function useStorePayouts(storeId: string) {
  return useQuery({
    queryKey: ['admin', 'payouts', storeId],
    queryFn: () => api<any>(`/api/admin/payouts/${storeId}`),
    enabled: !!storeId,
  });
}

export function useAdminCoupons() {
  return useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: () => api<any>('/api/admin/coupons'),
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      api('/api/admin/coupons', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; [key: string]: any }) =>
      api(`/api/admin/coupons/${data.id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/admin/coupons/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
}
