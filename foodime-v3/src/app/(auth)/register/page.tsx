'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleAuthButton } from '@/components/common/google-auth-button';
import { useGoogleAuth, useRegister } from '@/hooks/useAuth';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'BUYER' as 'BUYER' | 'SELLER' });
  const [error, setError] = useState('');
  const [successState, setSuccessState] = useState<{
    title: string;
    message: string;
    secondaryMessage?: string;
  } | null>(null);
  const register = useRegister();
  const googleAuth = useGoogleAuth();
  const router = useRouter();

  function maskPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await register.mutateAsync({
        ...form,
        phone: form.phone.replace(/\D/g, ''),
      });
      setSuccessState({
        title: 'Verifique seu email',
        message: `Enviamos um link de verificação para ${form.email}`,
        secondaryMessage:
          form.role === 'SELLER'
            ? 'Após verificar seu email, sua conta será analisada por um administrador antes de ser liberada.'
            : 'O link expira em 24 horas.',
      });
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta');
    }
  }

  async function handleGoogleRegister(credential: string) {
    setError('');

    try {
      const result = await googleAuth.mutateAsync({ credential, role: form.role });

      if ('accessToken' in result.data) {
        router.replace(result.data.user.role === 'SELLER' ? '/dashboard' : '/home');
        return;
      }

      setSuccessState({
        title: 'Conta criada com Google',
        message: result.data.message || 'Sua conta foi criada com sucesso.',
        secondaryMessage: 'Você poderá entrar assim que a aprovação for concluída.',
      });
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta com Google');
    }
  }

  const inputClass = 'w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-text placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-sm transition-all';

  if (successState) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm animate-slide-up text-center">
          <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif text-text mb-2">{successState.title}</h1>
          <p className="text-text-secondary text-sm mb-2">
            {successState.message}
          </p>
          {successState.secondaryMessage && (
            <p className="text-text-muted text-xs mb-4 bg-warning/10 border border-warning/30 rounded-xl px-4 py-2">
              {successState.secondaryMessage}
            </p>
          )}
          <Link href="/login" className="text-accent font-semibold text-sm hover:underline">
            Ir para login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border hover:border-border-hover transition-colors">
            <svg className="w-4 h-4 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-serif text-text">Criar conta</h1>
            <p className="text-text-secondary text-xs">FoodIME</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(['BUYER', 'SELLER'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setForm({ ...form, role })}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-semibold transition-all ${
                form.role === role
                  ? 'border-primary bg-primary/15 text-primary shadow-glow'
                  : 'border-border bg-surface text-text-secondary hover:border-border-hover'
              }`}
            >
              {role === 'BUYER' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z" />
                </svg>
              )}
              {role === 'BUYER' ? 'Comprador' : 'Vendedor'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nome completo</label>
            <input className={inputClass} placeholder="João Silva" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" className={inputClass} placeholder="seu@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Telefone</label>
            <input className={inputClass} placeholder="(21) 99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Senha</label>
            <input type="password" className={inputClass} placeholder="Mín. 8 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
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
            disabled={register.isPending}
            className="w-full h-12 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold shadow-warm hover:shadow-glow transition-all mt-2"
          >
            {register.isPending ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">ou</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <GoogleAuthButton
          onCredential={handleGoogleRegister}
          disabled={register.isPending || googleAuth.isPending}
        />

        <p className="text-center text-text-secondary text-sm mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="text-accent font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
