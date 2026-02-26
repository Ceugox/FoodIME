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

export interface VerifyEmailResponse {
  data: {
    role: string;
    status: string;
    message: string;
  };
}

export interface GoogleAuthResponse {
  data: {
    user: User;
    accessToken?: string;
    refreshToken?: string;
    message?: string;
    needsApproval?: boolean;
  };
}
