import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/schemas/auth';
import { forgotPassword } from '@/services/auth.service';
import { handleApiError } from '@/lib/api/errors';
import { rateLimit, getClientIp } from '@/lib/api/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const limited = rateLimit(`forgot:${ip}`, 2, 60_000);
    if (limited) return limited;

    const body = await req.json();
    const data = forgotPasswordSchema.parse(body);
    const result = await forgotPassword(data);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
