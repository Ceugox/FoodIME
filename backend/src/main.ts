import './instrument'; // Must be the very first import — Sentry needs early initialization
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ExpressAdapter } from '@nestjs/platform-express';
import helmet from 'helmet';
import express, { Request, Response, NextFunction } from 'express';

function isOriginAllowed(origin: string): boolean {
  // Railway subdomains (all owned by us)
  if (origin.endsWith('.up.railway.app')) return true;
  // Localhost for development
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  // Explicit env var origins
  const extra = process.env.CORS_ORIGINS;
  if (extra) {
    const list = extra.split(',').map((o) => o.trim().replace(/\/+$/, ''));
    if (list.includes(origin)) return true;
  }
  return false;
}

async function bootstrap() {
  // ── Create Express instance FIRST so CORS middleware sits at the top of the stack,
  //    BEFORE NestJS binds its routes during create(). ──
  const server = express();

  server.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin as string | undefined;

    if (origin && isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-signature,x-request-id');
      res.setHeader('Access-Control-Max-Age', '3600');
    }

    // Preflight: respond immediately — never let it reach guards/controllers
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    next();
  });

  server.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    crossOriginEmbedderPolicy: false,
  }));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), { rawBody: true });

  app.useGlobalFilters(new PrismaExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (process.env.NODE_ENV === 'production') {
    app.useLogger(['error', 'warn', 'log']);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on port ${port}`);
}
bootstrap();
