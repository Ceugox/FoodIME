import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { syncPaymentSchema } from '@/schemas/payments';
import { syncPaymentStatus } from '@/services/payments.service';

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const data = syncPaymentSchema.parse(body);
  const result = await syncPaymentStatus(data.orderId, data.paymentId, user);
  return NextResponse.json(result);
});
