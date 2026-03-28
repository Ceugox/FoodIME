import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/schemas/auth';
import { resetPassword } from '@/services/auth.service';
import { handleApiError } from '@/lib/api/errors';
import { rateLimit, getClientIp } from '@/lib/api/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const limited = rateLimit(`reset:${ip}`, 5, 60_000);
    if (limited) return limited;

    const body = await req.json();
    const data = resetPasswordSchema.parse(body);
    const result = await resetPassword(data);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
