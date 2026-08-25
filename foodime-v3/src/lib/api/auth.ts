import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, type UserPayload } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { handleApiError } from './errors';

type AuthHandler = (
  req: NextRequest,
  context: { user: UserPayload; params?: Record<string, string> },
) => Promise<NextResponse>;

export function withAuth(handler: AuthHandler) {
  return async (req: NextRequest, segmentData: { params: Promise<Record<string, string>> }) => {
    try {
      const token = req.cookies.get('access_token')?.value;
      if (!token) {
        return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
      }

      const user = await authenticateAccessToken(token);
      if (!user) {
        return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });
      }

      const params = segmentData?.params ? await segmentData.params : {};
      return await handler(req, { user, params });
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export async function authenticateAccessToken(token: string): Promise<UserPayload | null> {
  let payload: UserPayload;
  try {
    payload = await verifyAccessToken(token);
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, role: true, status: true, deletedAt: true },
  });

  if (!user || user.deletedAt || user.status !== 'ACTIVE') {
    return null;
  }

  return { id: user.id, email: user.email, role: user.role };
}
