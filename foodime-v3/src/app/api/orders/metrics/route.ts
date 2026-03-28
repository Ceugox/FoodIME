import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { getSellerMetrics } from '@/services/orders.service';

export const GET = withRoles(['SELLER'], async (_req: NextRequest, { user }) => {
  const result = await getSellerMetrics(user);
  return NextResponse.json(result);
});
