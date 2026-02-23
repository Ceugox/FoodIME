'use client';
import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/models.types';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data;
      setAuth(user as User, accessToken, refreshToken);
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: authService.register,
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data;
      setAuth(user as User, accessToken, refreshToken);
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  return clearAuth;
}
