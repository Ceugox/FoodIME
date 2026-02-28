'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useResetPassword } from '@/hooks/useAuth';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useResetPassword();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!token) {
      setError('Token de redefinição não encontrado.');
      return;
    }

    try {
      await resetPassword.mutateAsync({ token, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao redefinir senha.');
    }
  }

  const inputClass = 'w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-sm transition-all';

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm animate-slide-up text-center">
          <div className="w-16 h-16 bg-error/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif text-text mb-2">Link inválido</h1>
          <p className="text-text-secondary text-sm mb-4">Token de redefinição não encontrado.</p>
          <Link href="/forgot-password" className="text-accent font-semibold text-sm hover:underline">
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-[118px] rounded-xl overflow-hidden border border-border mb-4 flex items-center justify-center bg-surface">
            <Image src="/logo.png" alt="FoodIME" width={118} height={64} className="object-contain w-full h-full" />
          </div>
          <h1 className="text-3xl font-serif text-accent tracking-wide">FoodIME</h1>
          <p className="text-text-secondary text-sm mt-1">Redefinir senha</p>
        </div>

        {success ? (
          <div className="text-center animate-scale-in">
            <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-serif text-text mb-2">Senha redefinida!</h2>
            <p className="text-text-secondary text-sm mb-6">
              Sua senha foi alterada com sucesso. Faça login com a nova senha.
            </p>
            <Link
              href="/login"
              className="inline-block w-full h-12 bg-primary hover:bg-primary-light text-white rounded-xl font-bold shadow-warm hover:shadow-glow transition-all leading-[3rem] text-center"
            >
              Ir para login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-text-secondary text-sm text-center mb-6">
              Digite sua nova senha abaixo.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nova senha</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Confirmar senha</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
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
                disabled={resetPassword.isPending}
                className="w-full h-12 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold shadow-warm hover:shadow-glow transition-all mt-2"
              >
                {resetPassword.isPending ? 'Redefinindo...' : 'Redefinir senha'}
              </button>
            </form>

            <p className="text-center text-text-secondary text-sm mt-6">
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
