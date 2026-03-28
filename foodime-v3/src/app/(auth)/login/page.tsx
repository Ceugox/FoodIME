'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLogin, useResendVerification } from '@/hooks/useAuth';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const login = useLogin();
  const resend = useResendVerification();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setShowResend(false);
    try {
      const result = await login.mutateAsync(form);
      const role = result.data.user.role;
      router.replace(role === 'SELLER' ? '/dashboard' : role === 'ADMIN' ? '/admin/dashboard' : '/home');
    } catch (err: any) {
      const msg = err?.message || 'Email ou senha incorretos';
      setError(msg);
      if (msg.includes('não verificado')) {
        setShowResend(true);
        setResendEmail(form.email);
      }
    }
  }

  async function handleResend() {
    try {
      await resend.mutateAsync({ email: resendEmail });
      setError('Email de verificação reenviado!');
      setShowResend(false);
    } catch {
      // silent
    }
  }

  const inputClass = 'w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-sm transition-all';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-serif text-accent tracking-wide">FoodIME</h1>
          <p className="text-text-secondary text-sm mt-1">Entre na sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              className={inputClass}
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Senha</label>
            <input
              type="password"
              className={inputClass}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-accent text-xs font-semibold hover:underline">
              Esqueceu a senha?
            </Link>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-error/10 border border-error/30 rounded-xl px-4 py-2.5 animate-scale-in">
              <svg className="w-4 h-4 text-error flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L3.072 16.5C2.302 18.333 3.264 19 4.804 19z" />
              </svg>
              <p className="text-error text-xs">{error}</p>
            </div>
          )}

          {showResend && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resend.isPending}
              className="w-full text-sm text-accent font-semibold hover:underline disabled:opacity-50"
            >
              {resend.isPending ? 'Reenviando...' : 'Reenviar email de verificação'}
            </button>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full h-12 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold shadow-warm hover:shadow-glow transition-all mt-2"
          >
            {login.isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-text-secondary text-sm mt-6">
          Não tem conta?{' '}
          <Link href="/register" className="text-accent font-semibold hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
