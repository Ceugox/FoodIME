import type { User } from './models.types';

export interface ApiResponse<T> {
  data: T;
}

export interface ApiMessage {
  message: string;
}

export interface AuthResponse {
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}
