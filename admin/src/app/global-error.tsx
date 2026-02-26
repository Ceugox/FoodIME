'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Algo deu errado</h1>
          <button
            onClick={reset}
            style={{ padding: '8px 24px', background: '#6D7C3A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
