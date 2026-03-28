import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { createOrderSchema } from '@/schemas/orders';
import { createOrder } from '@/services/orders.service';

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const data = createOrderSchema.parse(body);
  const result = await createOrder(data, user);
  return NextResponse.json(result, { status: 201 });
});
