import { NextRequest, NextResponse } from 'next/server';
import { googleAuthSchema } from '@/schemas/auth';
import { googleAuth } from '@/services/auth.service';
import { setAuthCookiesOnResponse } from '@/lib/jwt';
import { handleApiError } from '@/lib/api/errors';
import { rateLimit, getClientIp } from '@/lib/api/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const limited = rateLimit(`google:${ip}`, 10, 60_000);
    if (limited) return limited;

    const body = await req.json();
    const data = googleAuthSchema.parse(body);
    const result = await googleAuth(data);

    const res = NextResponse.json(result);
    if ('accessToken' in result.data && result.data.accessToken && result.data.refreshToken) {
      setAuthCookiesOnResponse(res, result.data.accessToken, result.data.refreshToken);
    }
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
