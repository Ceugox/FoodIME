import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'unreachable' },
      { status: 503 }
    );
  }
}
