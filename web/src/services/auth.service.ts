import api from './api';
import type { AuthResponse, VerifyEmailResponse, GoogleAuthResponse } from '@/types/api.types';
import type { User } from '@/types/models.types';

interface RegisterParams {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'BUYER' | 'SELLER';
}

interface LoginParams {
  email: string;
  password: string;
}

interface GoogleAuthParams {
  credential: string;
  role?: 'BUYER' | 'SELLER';
}

export const authService = {
  register: (params: RegisterParams) =>
    api.post<{ message: string }>('/auth/register', params).then((r) => r.data),

  login: (params: LoginParams) =>
    api.post<AuthResponse>('/auth/login', params).then((r) => r.data),

  verifyEmail: (token: string) =>
    api.post<VerifyEmailResponse>('/auth/verify-email', { token }).then((r) => r.data),

  resendVerification: (email: string) =>
    api.post<{ message: string }>('/auth/resend-verification', { email }).then((r) => r.data),

  googleAuth: (params: GoogleAuthParams) =>
    api.post<GoogleAuthResponse>('/auth/google', params).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (params: { token: string; newPassword: string }) =>
    api.post<{ message: string }>('/auth/reset-password', params).then((r) => r.data),

  getProfile: () =>
    api.get<{ data: User }>('/auth/me').then((r) => r.data),
};
