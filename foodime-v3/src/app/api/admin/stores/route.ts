import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { getStores } from '@/services/admin.service';

export const GET = withRoles(['ADMIN'], async () => {
  const result = await getStores();
  return NextResponse.json(result);
});
