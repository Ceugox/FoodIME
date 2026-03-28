import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { getStorePayouts } from '@/services/admin.service';

export const GET = withRoles(['ADMIN'], async (_req: NextRequest, { params }) => {
  const result = await getStorePayouts(params!.storeId);
  return NextResponse.json(result);
});
