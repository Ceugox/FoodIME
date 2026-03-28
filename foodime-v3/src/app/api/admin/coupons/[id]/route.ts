import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { updateCouponSchema } from '@/schemas/payments';
import { updateCoupon, removeCoupon } from '@/services/coupons.service';

export const PATCH = withRoles(['ADMIN'], async (req: NextRequest, { params }) => {
  const body = await req.json();
  const data = updateCouponSchema.parse(body);
  const result = await updateCoupon(params!.id, data);
  return NextResponse.json(result);
});

export const DELETE = withRoles(['ADMIN'], async (_req: NextRequest, { params }) => {
  const result = await removeCoupon(params!.id);
  return NextResponse.json(result);
});
