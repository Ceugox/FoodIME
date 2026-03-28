'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useVerifyEmail, useResendVerification } from '@/hooks/useAuth';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const verifyEmail = useVerifyEmail();
  const resend = useResendVerification();
  const [status, setStatus] = useState<'loading' | 'success' | 'seller-pending' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificação não encontrado.');
      return;
    }

    verifyEmail.mutateAsync({ token })
      .then((result) => {
        if (result.data.role === 'SELLER' && result.data.status === 'PENDING') {
          setStatus('seller-pending');
        } else {
          setStatus('success');
        }
        setMessage(result.data.message);
      })
      .catch((err: any) => {
        setStatus('error');
        setMessage(err?.message || 'Erro ao verificar email.');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleResend() {
    if (!resendEmail) return;
    try {
      await resend.mutateAsync({ email: resendEmail });
      setMessage('Email de verificação reenviado!');
    } catch {
      // silent
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-slide-up text-center">
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif text-text mb-2">Email verificado!</h1>
            <p className="text-text-secondary text-sm mb-6">{message}</p>
            <Link href="/login" className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-light transition-colors">
              Ir para login
            </Link>
          </>
        )}

        {status === 'seller-pending' && (
          <>
            <div className="w-16 h-16 bg-warning/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif text-text mb-2">Aguardando aprovação</h1>
            <p className="text-text-secondary text-sm mb-6">{message}</p>
            <Link href="/login" className="text-accent font-semibold text-sm hover:underline">
              Ir para login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-error/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif text-text mb-2">Erro na verificação</h1>
            <p className="text-text-secondary text-sm mb-4">{message}</p>

            <div className="space-y-2 mt-4">
              <input
                type="email"
                placeholder="Seu email para reenviar"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text placeholder:text-text-muted focus:border-primary outline-none text-sm"
              />
              <button
                onClick={handleResend}
                disabled={resend.isPending || !resendEmail}
                className="w-full h-10 bg-primary/20 text-primary rounded-xl text-sm font-semibold hover:bg-primary/30 disabled:opacity-50 transition-colors"
              >
                {resend.isPending ? 'Reenviando...' : 'Reenviar verificação'}
              </button>
            </div>

            <Link href="/login" className="text-accent font-semibold text-sm hover:underline mt-4 inline-block">
              Ir para login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
