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
  return useMutation({
    mutationFn: authService.register,
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: authService.verifyEmail,
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: authService.resendVerification,
  });
}

export function useGoogleAuth() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: authService.googleAuth,
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data;
      if (accessToken && refreshToken) {
        setAuth(user as User, accessToken, refreshToken);
      }
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  return clearAuth;
}
