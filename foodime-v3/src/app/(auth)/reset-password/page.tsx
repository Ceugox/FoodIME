'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useResetPassword } from '@/hooks/useAuth';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const router = useRouter();
  const resetPassword = useResetPassword();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    try {
      await resetPassword.mutateAsync({ token, newPassword: password });
      setSuccess(true);
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao redefinir senha');
    }
  }

  const inputClass = 'w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-sm transition-all';

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm animate-slide-up text-center">
          <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif text-text mb-2">Senha redefinida!</h1>
          <p className="text-text-secondary text-sm">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-slide-up">
        <h1 className="text-2xl font-serif text-text mb-2">Redefinir senha</h1>
        <p className="text-text-secondary text-sm mb-6">Crie uma nova senha para sua conta.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nova senha</label>
            <input type="password" className={inputClass} placeholder="Mín. 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Confirmar senha</label>
            <input type="password" className={inputClass} placeholder="Repita a senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-error/10 border border-error/30 rounded-xl px-4 py-2.5 animate-scale-in">
              <p className="text-error text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={resetPassword.isPending}
            className="w-full h-12 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold shadow-warm hover:shadow-glow transition-all"
          >
            {resetPassword.isPending ? 'Redefinindo...' : 'Redefinir senha'}
          </button>
        </form>

        <p className="text-center text-text-secondary text-sm mt-6">
          <Link href="/login" className="text-accent font-semibold hover:underline">
            Voltar para login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
