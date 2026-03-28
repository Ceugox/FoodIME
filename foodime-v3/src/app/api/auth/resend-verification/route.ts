import { NextRequest, NextResponse } from 'next/server';
import { resendVerificationSchema } from '@/schemas/auth';
import { resendVerification } from '@/services/auth.service';
import { handleApiError } from '@/lib/api/errors';
import { rateLimit, getClientIp } from '@/lib/api/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const limited = rateLimit(`resend:${ip}`, 3, 60_000);
    if (limited) return limited;

    const body = await req.json();
    const data = resendVerificationSchema.parse(body);
    const result = await resendVerification(data);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
