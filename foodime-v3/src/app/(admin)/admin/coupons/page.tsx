'use client';

import { useState } from 'react';
import { useAdminCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon } from '@/hooks/useAdmin';
import { toast } from '@/components/common/toast';
import { ErrorState } from '@/components/common/error-state';

interface CouponForm {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  discount: string;
  usageLimit: string;
  expiresAt: string;
  isActive: boolean;
}

const EMPTY_FORM: CouponForm = { code: '', type: 'PERCENTAGE', discount: '', usageLimit: '', expiresAt: '', isActive: true };

export default function AdminCouponsPage() {
  const { data, isLoading, isError, refetch } = useAdminCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const coupons = data?.data || [];

  function openEdit(c: any) {
    setEditingId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      discount: String(Number(c.discount)),
      usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 16) : '',
      isActive: c.isActive,
    });
    setShowForm(true);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.code || !form.discount) {
      toast({ title: 'Preencha código e desconto', variant: 'error' });
      return;
    }
    const payload: any = {
      code: form.code,
      type: form.type,
      discount: parseFloat(form.discount),
    };
    if (form.usageLimit) payload.usageLimit = parseInt(form.usageLimit);
    if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();
    if (editingId) payload.isActive = form.isActive;

    try {
      if (editingId) {
        await updateCoupon.mutateAsync({ id: editingId, ...payload });
        toast({ title: 'Cupom atualizado', variant: 'success' });
      } else {
        await createCoupon.mutateAsync(payload);
        toast({ title: 'Cupom criado', variant: 'success' });
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      toast({ title: err?.message || 'Erro', variant: 'error' });
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteCoupon.mutateAsync(deleteId);
      toast({ title: 'Cupom removido', variant: 'success' });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: err?.message || 'Erro', variant: 'error' });
    }
  }

  if (isError) return <ErrorState message="Erro ao carregar cupons" onRetry={refetch} />;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif text-text">Cupons</h1>
        <button onClick={openCreate} className="h-9 px-4 bg-primary text-white rounded-xl text-sm font-semibold">Novo cupom</button>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-text-muted text-xs uppercase">Código</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Tipo</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Desconto</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Uso</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Expira</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Status</th>
              <th className="text-left p-3 text-text-muted text-xs uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-6 text-center text-text-muted">Carregando...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-text-muted">Nenhum cupom</td></tr>
            ) : (
              coupons.map((c: any) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-surface-2/50">
                  <td className="p-3 text-text font-mono font-bold">{c.code}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.type === 'PERCENTAGE' ? 'bg-blue-500/20 text-blue-400' : 'bg-accent/20 text-accent'}`}>
                      {c.type === 'PERCENTAGE' ? '%' : 'R$'}
                    </span>
                  </td>
                  <td className="p-3 text-text">{c.type === 'PERCENTAGE' ? `${Number(c.discount)}%` : `R$ ${Number(c.discount).toFixed(2)}`}</td>
                  <td className="p-3 text-text-secondary">{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ''}</td>
                  <td className="p-3 text-text-secondary text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.isActive ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
                      {c.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="text-[10px] text-primary font-bold hover:underline">Editar</button>
                      <button onClick={() => setDeleteId(c.id)} className="text-[10px] text-error font-bold hover:underline">Remover</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6" onClick={() => setShowForm(false)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text mb-4">{editingId ? 'Editar cupom' : 'Novo cupom'}</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Código"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full h-10 bg-background border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                  className="h-10 bg-background border border-border rounded-xl px-3 text-text text-sm focus:border-primary focus:outline-none"
                >
                  <option value="PERCENTAGE">Porcentagem</option>
                  <option value="FIXED">Valor fixo</option>
                </select>
                <input
                  type="number"
                  placeholder={form.type === 'PERCENTAGE' ? 'Ex: 10' : 'Ex: 5.00'}
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  className="flex-1 h-10 bg-background border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
              </div>
              <input
                type="number"
                placeholder="Limite de uso (opcional)"
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                className="w-full h-10 bg-background border border-border rounded-xl px-4 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full h-10 bg-background border border-border rounded-xl px-4 text-text text-sm focus:border-primary focus:outline-none"
              />
              {editingId && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" />
                  <span className="text-text text-sm">Ativo</span>
                </label>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 h-10 bg-surface-2 border border-border rounded-xl text-text-secondary font-semibold text-sm">Cancelar</button>
              <button onClick={handleSubmit} disabled={createCoupon.isPending || updateCoupon.isPending} className="flex-1 h-10 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-60">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6" onClick={() => setDeleteId(null)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text mb-2">Remover cupom?</h3>
            <p className="text-text-secondary text-sm mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 h-10 bg-surface-2 border border-border rounded-xl text-text-secondary font-semibold text-sm">Cancelar</button>
              <button onClick={handleDelete} disabled={deleteCoupon.isPending} className="flex-1 h-10 bg-error text-white rounded-xl font-semibold text-sm disabled:opacity-60">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
