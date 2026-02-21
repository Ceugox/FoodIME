export interface ApiResponse<T> {
  data: T;
}

export interface ApiMessage {
  message: string;
}

export interface AuthResponse {
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
    accessToken: string;
    refreshToken: string;
  };
}

export interface TokensResponse {
  data: {
    accessToken: string;
    refreshToken: string;
  };
}
