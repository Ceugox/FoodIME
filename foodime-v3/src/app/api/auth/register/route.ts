import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/schemas/auth';
import { register } from '@/services/auth.service';
import { handleApiError } from '@/lib/api/errors';
import { rateLimit, getClientIp } from '@/lib/api/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const limited = rateLimit(`register:${ip}`, 3, 60_000);
    if (limited) return limited;

    const body = await req.json();
    const data = registerSchema.parse(body);
    const result = await register(data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
