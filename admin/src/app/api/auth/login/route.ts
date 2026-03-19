import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, getAdminCookieOptions, getApiUrl } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.text();

  const response = await fetch(`${getApiUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(
      { message: payload.message || 'Credenciais inválidas' },
      { status: response.status },
    );
  }

  if (payload.data?.user?.role !== 'ADMIN' || !payload.data?.accessToken) {
    return NextResponse.json(
      { message: 'Acesso restrito a administradores' },
      { status: 403 },
    );
  }

  const nextResponse = NextResponse.json({
    data: {
      user: payload.data.user,
    },
  });

  nextResponse.cookies.set(
    ADMIN_COOKIE_NAME,
    payload.data.accessToken,
    getAdminCookieOptions(),
  );

  return nextResponse;
}
