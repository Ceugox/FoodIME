import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, setAuthCookiesOnResponse } from '@/lib/jwt';
import { refresh } from '@/services/auth.service';
import { handleApiError } from '@/lib/api/errors';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('refresh_token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Refresh token não encontrado' }, { status: 401 });
    }

    let payload;
    try {
      payload = await verifyRefreshToken(token);
    } catch {
      return NextResponse.json({ message: 'Refresh token inválido' }, { status: 401 });
    }

    const result = await refresh(payload, token);

    const res = NextResponse.json(result);
    setAuthCookiesOnResponse(res, result.data.accessToken, result.data.refreshToken);
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
