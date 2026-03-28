import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { updateStockSchema } from '@/schemas/products';
import { updateStock } from '@/services/products.service';

export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  const body = await req.json();
  const data = updateStockSchema.parse(body);
  const result = await updateStock(params!.id, data.stockQty, user);
  return NextResponse.json(result);
});
