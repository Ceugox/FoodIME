import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, getAdminCookieOptions, getApiUrl } from '@/lib/auth';

async function forward(request: Request, params: { path: string[] }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const path = params.path.join('/');
  const url = new URL(`/` + path, getApiUrl());
  const incomingUrl = new URL(request.url);
  url.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cookie');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = await request.text();
  }

  const upstream = await fetch(url, init);
  const contentType = upstream.headers.get('content-type') || 'application/json';
  const body = await upstream.text();

  const response = new NextResponse(body, {
    status: upstream.status,
    headers: {
      'content-type': contentType,
    },
  });

  if (upstream.status === 401 || upstream.status === 403) {
    response.cookies.set(ADMIN_COOKIE_NAME, '', {
      ...getAdminCookieOptions(),
      maxAge: 0,
    });
  }

  return response;
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, await context.params);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, await context.params);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, await context.params);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, await context.params);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, await context.params);
}
