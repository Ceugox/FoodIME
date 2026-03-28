import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { updateStatusSchema } from '@/schemas/orders';
import { updateOrderStatus } from '@/services/orders.service';

export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  const body = await req.json();
  const data = updateStatusSchema.parse(body);
  const result = await updateOrderStatus(params!.id, data.status, user);
  return NextResponse.json(result);
});
