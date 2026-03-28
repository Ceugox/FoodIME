import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, type UserPayload } from '@/lib/jwt';
import { handleApiError } from './errors';

type RolesHandler = (
  req: NextRequest,
  context: { user: UserPayload; params?: Record<string, string> },
) => Promise<NextResponse>;

export function withRoles(roles: string[], handler: RolesHandler) {
  return async (req: NextRequest, segmentData: { params: Promise<Record<string, string>> }) => {
    try {
      const token = req.cookies.get('access_token')?.value;
      if (!token) {
        return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
      }

      let user: UserPayload;
      try {
        user = await verifyAccessToken(token);
      } catch {
        return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });
      }

      if (!roles.includes(user.role)) {
        return NextResponse.json({ message: 'Acesso negado' }, { status: 403 });
      }

      const params = segmentData?.params ? await segmentData.params : {};
      return await handler(req, { user, params });
    } catch (error) {
      return handleApiError(error);
    }
  };
}
