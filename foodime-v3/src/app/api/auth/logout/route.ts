import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { logout } from '@/services/auth.service';
import { clearAuthCookiesOnResponse } from '@/lib/jwt';

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const refreshToken = req.cookies.get('refresh_token')?.value;
  const result = await logout(user.id, refreshToken);
  const res = NextResponse.json(result);
  clearAuthCookiesOnResponse(res);
  return res;
});
