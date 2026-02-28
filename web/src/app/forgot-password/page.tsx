'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForgotPassword } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const forgotPassword = useForgotPassword();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await forgotPassword.mutateAsync(email);
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao processar solicitação.');
    }
  }

  const inputClass = 'w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-sm transition-all';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-[118px] rounded-xl overflow-hidden border border-border mb-4 flex items-center justify-center bg-surface">
            <Image src="/logo.png" alt="FoodIME" width={118} height={64} className="object-contain w-full h-full" />
          </div>
          <h1 className="text-3xl font-serif text-accent tracking-wide">FoodIME</h1>
          <p className="text-text-secondary text-sm mt-1">Recuperar senha</p>
        </div>

        {sent ? (
          <div className="text-center animate-scale-in">
            <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-xl font-serif text-text mb-2">Verifique seu email</h2>
            <p className="text-text-secondary text-sm mb-6">
              Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
            <Link href="/login" className="text-accent font-semibold text-sm hover:underline">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-text-secondary text-sm text-center mb-6">
              Digite seu email e enviaremos um link para redefinir sua senha.
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
                  <svg className="w-4 h-4 text-error flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L3.072 16.5C2.302 18.333 3.264 19 4.804 19z" />
                  </svg>
                  <p className="text-error text-xs">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={forgotPassword.isPending}
                className="w-full h-12 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold shadow-warm hover:shadow-glow transition-all mt-2"
              >
                {forgotPassword.isPending ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>

            <p className="text-center text-text-secondary text-sm mt-6">
              Lembrou a senha?{' '}
              <Link href="/login" className="text-accent font-semibold hover:underline">
                Voltar ao login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
