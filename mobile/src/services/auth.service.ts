import api from './api';
import type { AuthResponse } from '../types/api.types';
import type { User } from '../types/models.types';

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

export const authService = {
  register: (params: RegisterParams) =>
    api.post<AuthResponse>('/auth/register', params).then((r) => r.data),

  login: (params: LoginParams) =>
    api.post<AuthResponse>('/auth/login', params).then((r) => r.data),

  getProfile: () =>
    api.get<{ data: User }>('/auth/me').then((r) => r.data),
};
