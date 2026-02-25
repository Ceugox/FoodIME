'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { apiFetch } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  createdAt: string;
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700 border-red-200',
    SELLER: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    BUYER: 'bg-green-100 text-green-700 border-green-200',
  };
  const labels: Record<string, string> = {
    ADMIN: 'Admin',
    SELLER: 'Vendedor',
    BUYER: 'Comprador',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {labels[role] || role}
    </span>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    const qs = params.toString();

    apiFetch<User[]>(`/admin/users${qs ? `?${qs}` : ''}`)
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  function handleRowClick(user: User) {
    if (user.role === 'SELLER') {
      router.push(`/sellers/${user.id}`);
    } else if (user.role === 'BUYER') {
      router.push(`/buyers/${user.id}`);
    }
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif text-foreground">Usuários</h2>
        <div className="flex gap-3">
          <input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[260px] h-10 rounded-lg border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary outline-none"
          >
            <option value="">Todos os perfis</option>
            <option value="BUYER">Compradores</option>
            <option value="SELLER">Vendedores</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <p className="p-10 text-center text-muted-foreground">Carregando...</p>
        ) : users.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Nenhum usuário encontrado</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Perfil</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => handleRowClick(user)}
                  className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${user.role !== 'ADMIN' ? 'cursor-pointer' : ''}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
