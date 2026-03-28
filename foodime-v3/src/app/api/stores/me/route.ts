import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { findMyStore } from '@/services/stores.service';

export const GET = withRoles(['SELLER'], async (_req: NextRequest, { user }) => {
  const result = await findMyStore(user);
  return NextResponse.json(result);
});
