import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export interface UserPayload {
  id: string;
  email: string;
  role: string;
}

const accessSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);
const refreshSecret = () => new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

export async function signAccessToken(payload: UserPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .setIssuedAt()
    .sign(accessSecret());
}

export async function signRefreshToken(payload: UserPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(refreshSecret());
}

export async function verifyAccessToken(token: string): Promise<UserPayload> {
  const { payload } = await jwtVerify(token, accessSecret());
  return payload as unknown as UserPayload;
}

export async function verifyRefreshToken(token: string): Promise<UserPayload> {
  const { payload } = await jwtVerify(token, refreshSecret());
  return payload as unknown as UserPayload;
}

const isProduction = process.env.NODE_ENV === 'production';

/** Set auth cookies on a NextResponse object */
export function setAuthCookiesOnResponse(res: NextResponse, accessToken: string, refreshToken: string) {
  res.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });

  res.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

/** Clear auth cookies on a NextResponse object */
export function clearAuthCookiesOnResponse(res: NextResponse) {
  res.cookies.set('access_token', '', { path: '/', maxAge: 0 });
  res.cookies.set('refresh_token', '', { path: '/', maxAge: 0 });
}

/** Read access token from incoming request cookies (for middleware/withAuth) */
export async function getTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('access_token')?.value;
}

export async function getRefreshTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('refresh_token')?.value;
}
