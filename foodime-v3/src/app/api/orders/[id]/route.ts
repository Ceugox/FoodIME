import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { findOrder } from '@/services/orders.service';

export const GET = withAuth(async (_req: NextRequest, { user, params }) => {
  const result = await findOrder(params!.id, user);
  return NextResponse.json(result);
});
