'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';
import { useBuyerOrders } from '@/hooks/useOrders';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: orders } = useBuyerOrders();

  if (!user) return null;

  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const completedOrders = orders?.filter((o) => o.status === 'PICKED_UP') || [];
  const totalSpent = completedOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const allOrders = orders?.length || 0;

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-serif text-text mb-6">Perfil</h1>

      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-3">
          <span className="text-2xl font-bold text-primary">{initials}</span>
        </div>
        <h2 className="text-lg font-bold text-text">{user.name}</h2>
        <p className="text-text-secondary text-sm">{user.email}</p>
        {user.phone && <p className="text-text-muted text-xs mt-1">{user.phone}</p>}
        <span className="mt-2 text-xs font-semibold bg-primary/15 text-primary px-3 py-1 rounded-full uppercase">
          {user.role === 'BUYER' ? 'Comprador' : user.role}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-surface rounded-2xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text">{allOrders}</p>
          <p className="text-xs text-text-muted mt-0.5">Pedido{allOrders !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-primary">R$ {totalSpent.toFixed(2)}</p>
          <p className="text-xs text-text-muted mt-0.5">Total gasto</p>
        </div>
      </div>

      {/* Orders link */}
      <Link
        href="/orders"
        className="flex items-center justify-between bg-surface rounded-2xl border border-border p-4 mb-3 hover:border-border-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-text">Histórico de pedidos</span>
        </div>
        <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>

      <button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="w-full h-12 bg-error/15 text-error rounded-xl font-semibold hover:bg-error/25 transition-colors mt-2"
      >
        {logout.isPending ? 'Saindo...' : 'Sair da conta'}
      </button>
    </div>
  );
}
