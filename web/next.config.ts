import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: { maxEntries: 200 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

module.exports = withSentryConfig(withPWA(nextConfig), {
  silent: true,
  // Only upload source maps when SENTRY_AUTH_TOKEN is set (CI/CD)
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
});
