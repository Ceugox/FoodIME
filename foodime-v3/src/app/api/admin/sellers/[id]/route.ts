import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { getSellerDashboard } from '@/services/admin.service';

export const GET = withRoles(['ADMIN'], async (_req: NextRequest, { params }) => {
  const result = await getSellerDashboard(params!.id);
  return NextResponse.json(result);
});
