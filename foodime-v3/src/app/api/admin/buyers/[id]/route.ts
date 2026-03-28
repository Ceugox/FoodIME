import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { getBuyerHistory } from '@/services/admin.service';

export const GET = withRoles(['ADMIN'], async (_req: NextRequest, { params }) => {
  const result = await getBuyerHistory(params!.id);
  return NextResponse.json(result);
});
