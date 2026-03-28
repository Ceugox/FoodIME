import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { getDashboardOverview } from '@/services/admin.service';

export const GET = withRoles(['ADMIN'], async () => {
  const result = await getDashboardOverview();
  return NextResponse.json(result);
});
