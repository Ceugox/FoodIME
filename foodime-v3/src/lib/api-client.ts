'use client';

type FetchOptions = RequestInit & { skipRefresh?: boolean };

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function api<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
  const { skipRefresh, ...fetchOptions } = options;

  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  });

  if (res.status === 401 && !skipRefresh) {
    // Try refresh
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = doRefresh();
    }

    const refreshed = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshed) {
      // Retry original request
      const retryRes = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
        ...fetchOptions,
      });

      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ message: 'Erro' }));
        throw new ApiError(retryRes.status, err.message || 'Erro');
      }

      return retryRes.json();
    }

    // Refresh failed — redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Sessão expirada');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro' }));
    throw new ApiError(res.status, err.message || 'Erro');
  }

  // Some endpoints return no body (204)
  if (res.status === 204) return undefined as T;

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
