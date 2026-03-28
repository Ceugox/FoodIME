import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { updateStoreSchema } from '@/schemas/stores';
import { findStore, updateStore } from '@/services/stores.service';
import { handleApiError } from '@/lib/api/errors';

export async function GET(
  _req: NextRequest,
  segmentData: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await segmentData.params;
    const result = await findStore(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withAuth(async (req, { user, params }) => {
  const body = await req.json();
  const data = updateStoreSchema.parse(body);
  const result = await updateStore(params!.id, data, user);
  return NextResponse.json(result);
});
