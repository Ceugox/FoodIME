import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;
  const loginUrl = new URL('/login', request.url);

  if (pathname.startsWith('/login')) {
    if (token) {
      const payload = await verifyAdminToken(token);
      if (payload) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    const response = NextResponse.next();
    if (token) {
      response.cookies.delete(ADMIN_COOKIE_NAME);
    }
    return response;
  }

  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyAdminToken(token);
  if (!payload) {
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(ADMIN_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
