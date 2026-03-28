import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { createPayoutSchema } from '@/schemas/admin';
import { getPayoutOverview, createPayout } from '@/services/admin.service';

export const GET = withRoles(['ADMIN'], async () => {
  const result = await getPayoutOverview();
  return NextResponse.json(result);
});

export const POST = withRoles(['ADMIN'], async (req: NextRequest) => {
  const body = await req.json();
  const data = createPayoutSchema.parse(body);
  const result = await createPayout(data);
  return NextResponse.json(result, { status: 201 });
});
