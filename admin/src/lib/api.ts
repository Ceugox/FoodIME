const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('admin_token') || '';
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }

  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}
