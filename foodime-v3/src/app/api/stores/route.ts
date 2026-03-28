import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { withRoles } from '@/lib/api/roles';
import { createStoreSchema } from '@/schemas/stores';
import { findAllStores, createStore } from '@/services/stores.service';
import { handleApiError } from '@/lib/api/errors';

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search') || undefined;
    const result = await findAllStores(search);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withRoles(['SELLER'], async (req, { user }) => {
  const body = await req.json();
  const data = createStoreSchema.parse(body);
  const result = await createStore(data, user);
  return NextResponse.json(result, { status: 201 });
});
