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
  status: string;
  emailVerified: boolean;
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    BLOCKED: 'bg-red-100 text-red-700 border-red-200',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Ativo',
    PENDING: 'Pendente',
    BLOCKED: 'Bloqueado',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {labels[status] || status}
    </span>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  loading,
  showReason,
  reason,
  onReasonChange,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  showReason?: boolean;
  reason?: string;
  onReasonChange?: (v: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        {showReason && (
          <textarea
            placeholder="Motivo (opcional)"
            value={reason}
            onChange={(e) => onReasonChange?.(e.target.value)}
            className="w-full h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none mb-4 resize-none"
          />
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-input hover:bg-muted/50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 text-sm rounded-lg text-white font-semibold disabled:opacity-50 transition-colors ${confirmClass}`}>
            {loading ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<{ type: 'approve' | 'block'; user: User } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('status', statusFilter);
    const qs = params.toString();

    apiFetch<User[]>(`/admin/users${qs ? `?${qs}` : ''}`)
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, roleFilter, statusFilter]);

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

  async function handleConfirm() {
    if (!modal) return;
    setModalLoading(true);
    try {
      const status = modal.type === 'approve' ? 'ACTIVE' : 'BLOCKED';
      const body: any = { status };
      if (modal.type === 'block' && rejectReason) body.reason = rejectReason;

      await apiFetch(`/admin/users/${modal.user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      setModal(null);
      setRejectReason('');
      fetchUsers();
    } catch {
      // error handling
    } finally {
      setModalLoading(false);
    }
  }

  const statusTabs = [
    { value: '', label: 'Todos' },
    { value: 'PENDING', label: 'Pendentes' },
    { value: 'ACTIVE', label: 'Ativos' },
    { value: 'BLOCKED', label: 'Bloqueados' },
  ];

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-4">
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

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-muted/50 rounded-lg p-1 w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cadastro</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td
                    className={`px-4 py-3 text-sm font-medium text-foreground ${user.role !== 'ADMIN' ? 'cursor-pointer' : ''}`}
                    onClick={() => handleRowClick(user)}
                  >
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {user.status === 'PENDING' && user.emailVerified && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setModal({ type: 'approve', user }); }}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setModal({ type: 'block', user }); }}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            Rejeitar
                          </button>
                        </>
                      )}
                      {user.status === 'ACTIVE' && user.role !== 'ADMIN' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setModal({ type: 'block', user }); }}
                          className="px-3 py-1 text-xs font-semibold rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Bloquear
                        </button>
                      )}
                      {user.status === 'BLOCKED' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setModal({ type: 'approve', user }); }}
                          className="px-3 py-1 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          Desbloquear
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={modal?.type === 'approve'}
        title="Aprovar usuário"
        message={`Tem certeza que deseja aprovar ${modal?.user.name}? O usuário receberá um email de confirmação.`}
        confirmLabel="Aprovar"
        confirmClass="bg-emerald-600 hover:bg-emerald-700"
        onConfirm={handleConfirm}
        onCancel={() => setModal(null)}
        loading={modalLoading}
      />

      <ConfirmModal
        open={modal?.type === 'block'}
        title={modal?.user.status === 'PENDING' ? 'Rejeitar usuário' : 'Bloquear usuário'}
        message={`Tem certeza que deseja ${modal?.user.status === 'PENDING' ? 'rejeitar' : 'bloquear'} ${modal?.user.name}?`}
        confirmLabel={modal?.user.status === 'PENDING' ? 'Rejeitar' : 'Bloquear'}
        confirmClass="bg-red-600 hover:bg-red-700"
        onConfirm={handleConfirm}
        onCancel={() => { setModal(null); setRejectReason(''); }}
        loading={modalLoading}
        showReason
        reason={rejectReason}
        onReasonChange={setRejectReason}
      />
    </AdminLayout>
  );
}
