import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { updateProductSchema } from '@/schemas/products';
import { findProduct, updateProduct, removeProduct } from '@/services/products.service';
import { handleApiError } from '@/lib/api/errors';

export async function GET(
  _req: NextRequest,
  segmentData: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await segmentData.params;
    const result = await findProduct(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withAuth(async (req, { user, params }) => {
  const body = await req.json();
  const data = updateProductSchema.parse(body);
  const result = await updateProduct(params!.id, data, user);
  return NextResponse.json(result);
});

export const DELETE = withAuth(async (_req, { user, params }) => {
  const result = await removeProduct(params!.id, user);
  return NextResponse.json(result);
});
