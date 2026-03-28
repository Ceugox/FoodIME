'use client';

import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  if (!user) return null;

  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-serif text-text mb-6">Perfil</h1>

      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-3">
          <span className="text-2xl font-bold text-primary">{initials}</span>
        </div>
        <h2 className="text-lg font-bold text-text">{user.name}</h2>
        <p className="text-text-secondary text-sm">{user.email}</p>
        {user.phone && <p className="text-text-muted text-xs mt-1">{user.phone}</p>}
        <span className="mt-2 text-xs font-semibold bg-primary/15 text-primary px-3 py-1 rounded-full uppercase">
          {user.role}
        </span>
      </div>

      <button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="w-full h-12 bg-error/15 text-error rounded-xl font-semibold hover:bg-error/25 transition-colors"
      >
        {logout.isPending ? 'Saindo...' : 'Sair da conta'}
      </button>
    </div>
  );
}
