'use client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const logout = useLogout();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="px-5 pt-4 animate-slide-up">
      <h1 className="text-2xl font-serif text-text mb-5">Perfil</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 py-6 bg-surface rounded-xl border border-border mb-5">
        <div className="w-16 h-16 rounded-full bg-primary-dark flex items-center justify-center border-2 border-primary animate-warm-pulse">
          <span className="text-2xl font-serif text-accent">
            {user?.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="text-center">
          <p className="font-serif text-text text-lg">{user?.name}</p>
          <p className="text-text-secondary text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-surface rounded-xl border border-border divide-y divide-border mb-5">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-text-secondary text-sm">Telefone</span>
          <span className="text-text font-medium text-sm">{user?.phone || '—'}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-text-secondary text-sm">Perfil</span>
          <span className="text-primary font-semibold text-sm capitalize">{user?.role === 'BUYER' ? 'Comprador' : 'Vendedor'}</span>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full h-12 rounded-xl border border-error/40 text-error font-semibold hover:bg-error/10 transition-all"
      >
        Sair da conta
      </button>
    </div>
  );
}
