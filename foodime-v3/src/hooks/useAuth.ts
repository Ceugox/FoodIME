'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

interface AuthResponse {
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

type GoogleAuthResponse =
  | AuthResponse
  | {
      data: {
        user: { id: string; name: string; email: string; role: 'BUYER' | 'SELLER' | 'ADMIN' };
        message: string;
        needsApproval: true;
      };
    };

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (response) => {
      setUser(response.data.user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string; phone?: string; role: string }) =>
      api<{ message: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (data: { token: string }) =>
      api<{ data: { role: string; status: string; message: string } }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      api<{ message: string }>('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useGoogleAuth() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (data: { credential: string; role?: string }) =>
      api<GoogleAuthResponse>('/api/auth/google', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (response) => {
      if ('accessToken' in response.data && response.data.user) {
        setUser(response.data.user);
      }
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      api<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { token: string; newPassword: string }) =>
      api<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: () =>
      api('/api/auth/logout', { method: 'POST' }),
    onSettled: () => {
      clearAuth();
      window.location.href = '/login';
    },
  });
}
