import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'bff753c9-7a84-4b24-bb83-94cc5132d308',
);

async function getRole(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
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

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && token) {
    const role = await getRole(token);
    if (role === 'BUYER') return NextResponse.redirect(new URL('/home', request.url));
    if (role === 'SELLER') return NextResponse.redirect(new URL('/dashboard', request.url));
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
    '/login',
    '/register',
  ],
};
