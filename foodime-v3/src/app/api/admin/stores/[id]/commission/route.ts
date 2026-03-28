import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/api/roles';
import { updateCommissionSchema } from '@/schemas/admin';
import { updateStoreCommission } from '@/services/admin.service';

export const PATCH = withRoles(['ADMIN'], async (req: NextRequest, { params }) => {
  const body = await req.json();
  const data = updateCommissionSchema.parse(body);
  const result = await updateStoreCommission(params!.id, data.commissionRate);
  return NextResponse.json(result);
});
