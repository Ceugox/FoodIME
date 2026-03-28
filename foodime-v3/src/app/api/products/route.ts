import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { createProductSchema } from '@/schemas/products';
import { findProductsByStore, createProduct } from '@/services/products.service';
import { handleApiError } from '@/lib/api/errors';

export async function GET(req: NextRequest) {
  try {
    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json({ message: 'storeId é obrigatório' }, { status: 400 });
    }
    const result = await findProductsByStore(storeId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withRoles(['SELLER'], async (req, { user }) => {
  const body = await req.json();
  const data = createProductSchema.parse(body);
  const result = await createProduct(data, user);
  return NextResponse.json(result, { status: 201 });
});
