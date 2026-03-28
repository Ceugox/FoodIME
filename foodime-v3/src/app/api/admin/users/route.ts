import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { getUsers } from '@/services/admin.service';

export const GET = withRoles(['ADMIN'], async (req: NextRequest) => {
  const url = new URL(req.url);
  const result = await getUsers({
    role: url.searchParams.get('role') || undefined,
    status: url.searchParams.get('status') || undefined,
    search: url.searchParams.get('search') || undefined,
    page: Number(url.searchParams.get('page')) || 1,
    limit: Number(url.searchParams.get('limit')) || 20,
  });
  return NextResponse.json(result);
});
