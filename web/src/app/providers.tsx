'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { OfflineBanner } from '@/components/common/OfflineBanner';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 30_000,
          },
        },
      }),
  );

  const content = (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
      <OfflineBanner />
    </QueryClientProvider>
  );

  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {content}
      </GoogleOAuthProvider>
    );
  }

  return content;
}
