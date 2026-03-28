import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { getPaymentByOrder } from '@/services/payments.service';

export const GET = withAuth(async (_req: NextRequest, { user, params }) => {
  const result = await getPaymentByOrder(params!.orderId, user);
  return NextResponse.json(result);
});
