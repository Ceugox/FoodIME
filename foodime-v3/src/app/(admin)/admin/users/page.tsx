'use client';

import { useState } from 'react';
import { useAdminUsers, useUpdateUserStatus, useDeleteUser } from '@/hooks/useAdmin';
import { toast } from '@/components/common/toast';
import { ErrorState } from '@/components/common/error-state';

const STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING_APPROVAL', label: 'Pendentes' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'BLOCKED', label: 'Bloqueados' },
];

const ROLE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'BUYER', label: 'Compradores' },
  { value: 'SELLER', label: 'Vendedores' },
  { value: 'ADMIN', label: 'Admins' },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string; name: string } | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, isError, refetch } = useAdminUsers({ role: role || undefined, status: status || undefined, search: search || undefined, page });
  const updateStatus = useUpdateUserStatus();
  const deleteUser = useDeleteUser();

  async function handleStatusUpdate(id: string, newStatus: 'ACTIVE' | 'BLOCKED') {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus, reason: reason || undefined });
      toast({ title: 'Status atualizado', variant: 'success' });
      setConfirmAction(null);
      setReason('');
    } catch (err: any) {
      toast({ title: err?.message || 'Erro', variant: 'error' });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteUser.mutateAsync(id);
      toast({ title: 'Usuário removido', variant: 'success' });
      setConfirmAction(null);
    } catch (err: any) {
      toast({ title: err?.message || 'Erro', variant: 'error' });
    }
  }

  if (isError) return <ErrorState message="Erro ao carregar usuários" onRetry={refetch} />;

  const users = data?.data || [];
  const meta = data?.meta;

  const statusColor: Record<string, string> = {
    ACTIVE: 'bg-success/20 text-success',
    PENDING_APPROVAL: 'bg-accent/20 text-accent',
    BLOCKED: 'bg-error/20 text-error',
  };

  const roleColor: Record<string, string> = {
    BUYER: 'bg-blue-500/20 text-blue-400',
    SELLER: 'bg-primary/20 text-primary',
    ADMIN: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-serif text-text mb-6">Usuários</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-10 bg-surface border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none w-64"
        />
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="h-10 bg-surface border border-border rounded-xl px-3 text-text text-sm focus:border-primary focus:outline-none"
        >
          {ROLE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setStatus(t.value); setPage(1); }}
            className={`px-4 h-9 rounded-xl text-xs font-semibold transition-all ${
              status === t.value ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-text-muted text-xs uppercase">Nome</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Email</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Role</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Status</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-6 text-center text-text-muted">Carregando...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-text-muted">Nenhum usuário encontrado</td></tr>
            ) : (
              users.map((u: any) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-surface-2/50">
                  <td className="p-3 text-text font-medium">{u.name}</td>
                  <td className="p-3 text-text-secondary">{u.email}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${roleColor[u.role] || ''}`}>{u.role}</span></td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[u.status] || ''}`}>{u.status}</span></td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {u.status === 'PENDING_APPROVAL' && (
                        <button onClick={() => handleStatusUpdate(u.id, 'ACTIVE')} className="text-[10px] text-success font-bold hover:underline">Aprovar</button>
                      )}
                      {u.status === 'ACTIVE' && (
                        <button onClick={() => setConfirmAction({ id: u.id, action: 'block', name: u.name })} className="text-[10px] text-error font-bold hover:underline">Bloquear</button>
                      )}
                      {u.status === 'BLOCKED' && (
                        <button onClick={() => handleStatusUpdate(u.id, 'ACTIVE')} className="text-[10px] text-success font-bold hover:underline">Desbloquear</button>
                      )}
                      <button onClick={() => setConfirmAction({ id: u.id, action: 'delete', name: u.name })} className="text-[10px] text-text-muted font-bold hover:underline">Remover</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: meta.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-bold ${p === page ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6" onClick={() => { setConfirmAction(null); setReason(''); }}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text mb-2">
              {confirmAction.action === 'block' ? 'Bloquear' : 'Remover'} {confirmAction.name}?
            </h3>
            {confirmAction.action === 'block' && (
              <input
                type="text"
                placeholder="Motivo (opcional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-10 bg-background border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none mb-4"
              />
            )}
            <div className="flex gap-2">
              <button onClick={() => { setConfirmAction(null); setReason(''); }} className="flex-1 h-10 bg-surface-2 border border-border rounded-xl text-text-secondary font-semibold text-sm">Cancelar</button>
              <button
                onClick={() => confirmAction.action === 'block' ? handleStatusUpdate(confirmAction.id, 'BLOCKED') : handleDelete(confirmAction.id)}
                className="flex-1 h-10 bg-error text-white rounded-xl font-semibold text-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
