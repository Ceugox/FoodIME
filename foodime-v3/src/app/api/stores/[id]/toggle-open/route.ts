import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { toggleStoreOpen } from '@/services/stores.service';

export const POST = withRoles(['SELLER'], async (_req: NextRequest, { user, params }) => {
  const result = await toggleStoreOpen(params!.id, user);
  return NextResponse.json(result);
});
