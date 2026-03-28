import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailSchema } from '@/schemas/auth';
import { verifyEmail } from '@/services/auth.service';
import { handleApiError } from '@/lib/api/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = verifyEmailSchema.parse(body);
    const result = await verifyEmail(data);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
