// This file must be imported FIRST in main.ts — before any other imports.
// Sentry needs to instrument the app before NestJS initializes.
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Disabled locally if SENTRY_DSN is not set
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  // Sample 20% of transactions in production to stay on free tier
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  // Do not send user PII (email, IP) by default
  sendDefaultPii: false,
});
