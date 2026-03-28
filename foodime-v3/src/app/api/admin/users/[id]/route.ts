import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { updateUserSchema } from '@/schemas/admin';
import { getUser, updateUser, deleteUser } from '@/services/admin.service';

export const GET = withRoles(['ADMIN'], async (_req: NextRequest, { params }) => {
  const result = await getUser(params!.id);
  return NextResponse.json(result);
});

export const PATCH = withRoles(['ADMIN'], async (req: NextRequest, { params }) => {
  const body = await req.json();
  const data = updateUserSchema.parse(body);
  const result = await updateUser(params!.id, data);
  return NextResponse.json(result);
});

export const DELETE = withRoles(['ADMIN'], async (_req: NextRequest, { params }) => {
  const result = await deleteUser(params!.id);
  return NextResponse.json(result);
});
