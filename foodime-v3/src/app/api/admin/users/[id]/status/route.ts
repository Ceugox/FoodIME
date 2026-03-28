import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { updateUserStatusSchema } from '@/schemas/admin';
import { updateUserStatus } from '@/services/admin.service';

export const PATCH = withRoles(['ADMIN'], async (req: NextRequest, { params }) => {
  const body = await req.json();
  const data = updateUserStatusSchema.parse(body);
  const result = await updateUserStatus(params!.id, data.status, data.reason);
  return NextResponse.json(result);
});
