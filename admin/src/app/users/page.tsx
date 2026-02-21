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

  function roleBadge(role: string) {
    const map: Record<string, string> = {
      ADMIN: 'badge badge-error',
      SELLER: 'badge badge-warning',
      BUYER: 'badge badge-success',
    };
    const labels: Record<string, string> = {
      ADMIN: 'Admin',
      SELLER: 'Vendedor',
      BUYER: 'Comprador',
    };
    return <span className={map[role] || 'badge badge-secondary'}>{labels[role] || role}</span>;
  }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Usuarios</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">Todos os perfis</option>
            <option value="BUYER">Compradores</option>
            <option value="SELLER">Vendedores</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Carregando...</p>
        ) : users.length === 0 ? (
          <p style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Nenhum usuario encontrado</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Perfil</th>
                <th>Telefone</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => handleRowClick(user)}
                  style={{ cursor: user.role !== 'ADMIN' ? 'pointer' : 'default' }}
                >
                  <td style={{ fontWeight: 500 }}>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{roleBadge(user.role)}</td>
                  <td>{user.phone || '—'}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
