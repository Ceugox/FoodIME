import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

async function getRole(token: string): Promise<string | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return (payload as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isBuyerRoute = pathname.startsWith('/home') || pathname.startsWith('/store') ||
    pathname.startsWith('/cart') || pathname.startsWith('/checkout') ||
    pathname.startsWith('/orders') || pathname.startsWith('/profile');
  const isSellerRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/seller');
  const isAdminRoute = pathname.startsWith('/admin');

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && token) {
    const role = await getRole(token);
    if (role === 'BUYER') return NextResponse.redirect(new URL('/home', request.url));
    if (role === 'SELLER') return NextResponse.redirect(new URL('/dashboard', request.url));
    if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Protect buyer routes
  if (isBuyerRoute) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    const role = await getRole(token);
    if (!role) return NextResponse.redirect(new URL('/login', request.url));
    if (role !== 'BUYER') return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protect seller routes
  if (isSellerRoute) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    const role = await getRole(token);
    if (!role) return NextResponse.redirect(new URL('/login', request.url));
    if (role !== 'SELLER') return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protect admin routes
  if (isAdminRoute) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    const role = await getRole(token);
    if (!role) return NextResponse.redirect(new URL('/login', request.url));
    if (role !== 'ADMIN') return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/home/:path*',
    '/store/:path*',
    '/cart/:path*',
    '/checkout/:path*',
    '/orders/:path*',
    '/profile/:path*',
    '/dashboard/:path*',
    '/seller/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};
