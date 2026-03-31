import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { initiatePaymentSchema } from '@/schemas/payments';
import { initiatePayment } from '@/services/payments.service';

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const data = initiatePaymentSchema.parse(body);
  const result = await initiatePayment(data.orderId, data.method, user, data.cardHash);
  return NextResponse.json(result);
});
