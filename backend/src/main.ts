import './instrument'; // Must be the very first import — Sentry needs early initialization
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, ''))
    : ['http://localhost:3001', 'http://localhost:3002'];

  console.log('CORS allowed origins:', allowedOrigins);
  console.log('Raw CORS_ORIGINS env:', JSON.stringify(process.env.CORS_ORIGINS));

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, healthchecks)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Allow any Railway subdomain (all owned by us)
      if (origin.endsWith('.up.railway.app')) {
        callback(null, true);
        return;
      }
      // Allow explicitly listed origins
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // Allow localhost in development
      if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
        callback(null, true);
        return;
      }
      console.log('CORS blocked origin:', origin);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-signature', 'x-request-id'],
    maxAge: 3600,
  });

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    crossOriginEmbedderPolicy: false,
  }));

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
