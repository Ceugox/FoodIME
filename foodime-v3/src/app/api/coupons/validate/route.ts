import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { validateCouponSchema } from '@/schemas/payments';
import { validateCoupon } from '@/services/coupons.service';

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const data = validateCouponSchema.parse(body);
  const result = await validateCoupon(data.code);
  return NextResponse.json(result);
});
