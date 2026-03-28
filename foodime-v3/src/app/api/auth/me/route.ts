import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { getProfile } from '@/services/auth.service';

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  const result = await getProfile(user);
  return NextResponse.json(result);
});
