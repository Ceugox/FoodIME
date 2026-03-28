import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json({ message: error.message }, { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    const messages = error.errors.map((e) => e.message).join(', ');
    return NextResponse.json({ message: messages }, { status: 400 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2025':
        return NextResponse.json({ message: 'Registro não encontrado' }, { status: 404 });
      case 'P2002': {
        const fields = (error.meta?.target as string[])?.join(', ') || 'campo';
        return NextResponse.json({ message: `Valor duplicado para: ${fields}` }, { status: 409 });
      }
      case 'P2003':
        return NextResponse.json({ message: 'Referência inválida' }, { status: 400 });
      default:
        console.error('Prisma error:', error.code, error.message);
        return NextResponse.json({ message: 'Erro interno' }, { status: 500 });
    }
  }

  console.error('Unhandled error:', error);
  return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
}
