import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { createCouponSchema } from '@/schemas/payments';
import { createCoupon, listCoupons } from '@/services/coupons.service';

export const GET = withRoles(['ADMIN'], async () => {
  const result = await listCoupons();
  return NextResponse.json(result);
});

export const POST = withRoles(['ADMIN'], async (req: NextRequest) => {
  const body = await req.json();
  const data = createCouponSchema.parse(body);
  const result = await createCoupon(data);
  return NextResponse.json(result, { status: 201 });
});
