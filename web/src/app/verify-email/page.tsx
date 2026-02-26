'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useVerifyEmail, useResendVerification } from '@/hooks/useAuth';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const verify = useVerifyEmail();
  const resend = useResendVerification();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'seller-pending'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificação não encontrado.');
      return;
    }

    verify.mutateAsync(token).then((result) => {
      if (result.data.status === 'PENDING') {
        setStatus('seller-pending');
        setMessage(result.data.message);
      } else {
        setStatus('success');
        setMessage(result.data.message);
        setTimeout(() => router.replace('/login'), 3000);
      }
    }).catch((err: any) => {
      setStatus('error');
      setMessage(err?.response?.data?.message || 'Erro ao verificar email.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleResend() {
    if (!email) return;
    try {
      await resend.mutateAsync(email);
      setMessage('Novo email de verificação enviado!');
    } catch {
      // silent
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-slide-up text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary text-sm">Verificando seu email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif text-text mb-2">{message}</h1>
            <p className="text-text-secondary text-sm">Redirecionando para o login...</p>
          </>
        )}

        {status === 'seller-pending' && (
          <>
            <div className="w-16 h-16 bg-warning/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif text-text mb-2">Email verificado!</h1>
            <p className="text-text-secondary text-sm mb-4">{message}</p>
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

            <div className="space-y-3">
              <input
                type="email"
                placeholder="Seu email para reenviar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-sm transition-all"
              />
              <button
                onClick={handleResend}
                disabled={resend.isPending || !email}
                className="w-full h-10 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all"
              >
                {resend.isPending ? 'Enviando...' : 'Reenviar email de verificação'}
              </button>
            </div>

            <Link href="/login" className="text-accent font-semibold text-sm hover:underline mt-4 inline-block">
              Voltar ao login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
