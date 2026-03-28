'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForgotPassword } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const forgotPassword = useForgotPassword();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await forgotPassword.mutateAsync({ email });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar email');
    }
  }

  const inputClass = 'w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-sm transition-all';

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm animate-slide-up text-center">
          <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif text-text mb-2">Email enviado</h1>
          <p className="text-text-secondary text-sm mb-6">
            Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
          </p>
          <Link href="/login" className="text-accent font-semibold text-sm hover:underline">
            Voltar para login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-slide-up">
        <h1 className="text-2xl font-serif text-text mb-2">Esqueceu a senha?</h1>
        <p className="text-text-secondary text-sm mb-6">
          Informe seu email e enviaremos um link para redefinir sua senha.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              className={inputClass}
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-error/10 border border-error/30 rounded-xl px-4 py-2.5 animate-scale-in">
              <p className="text-error text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={forgotPassword.isPending}
            className="w-full h-12 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold shadow-warm hover:shadow-glow transition-all"
          >
            {forgotPassword.isPending ? 'Enviando...' : 'Enviar link'}
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
