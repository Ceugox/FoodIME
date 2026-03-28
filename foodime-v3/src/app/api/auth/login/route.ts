import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/schemas/auth';
import { login } from '@/services/auth.service';
import { setAuthCookiesOnResponse } from '@/lib/jwt';
import { handleApiError } from '@/lib/api/errors';
import { rateLimit, getClientIp } from '@/lib/api/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const limited = rateLimit(`login:${ip}`, 5, 60_000);
    if (limited) return limited;

    const body = await req.json();
    const data = loginSchema.parse(body);
    const result = await login(data);

    const res = NextResponse.json(result);
    setAuthCookiesOnResponse(res, result.data.accessToken, result.data.refreshToken);
    return res;
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    return handleApiError(error);
  }
}
