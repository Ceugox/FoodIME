import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { handleApiError } from './errors';

export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (req: NextRequest, data: T) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      const data = schema.parse(body);
      return await handler(req, data);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
