import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { findByBuyer } from '@/services/orders.service';

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  const result = await findByBuyer(user);
  return NextResponse.json(result);
});
