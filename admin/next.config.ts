import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withSentryConfig(nextConfig, {
  silent: true,
  // Only upload source maps when SENTRY_AUTH_TOKEN is set (CI/CD)
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
});
