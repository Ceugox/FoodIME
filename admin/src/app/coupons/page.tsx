'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { apiFetch } from '@/lib/api';

interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  discount: number;
  isActive: boolean;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
}

interface CouponForm {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  discount: string;
  usageLimit: string;
  expiresAt: string;
  isActive: boolean;
}

const emptyCouponForm: CouponForm = {
  code: '',
  type: 'PERCENTAGE',
  discount: '',
  usageLimit: '',
  expiresAt: '',
  isActive: true,
};

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
        active
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
          : 'bg-red-100 text-red-700 border-red-200'
      }`}
    >
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
        type === 'PERCENTAGE'
          ? 'bg-blue-100 text-blue-700 border-blue-200'
          : 'bg-purple-100 text-purple-700 border-purple-200'
      }`}
    >
      {type === 'PERCENTAGE' ? 'Percentual' : 'Fixo'}
    </span>
  );
}

function CouponModal({
  open,
  title,
  form,
  onChange,
  onSubmit,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  form: CouponForm;
  onChange: (form: CouponForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Codigo</label>
            <input
              value={form.code}
              onChange={(e) => onChange({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="EX: BEMVINDO10"
              className="w-full h-10 rounded-lg border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => onChange({ ...form, type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary outline-none"
              >
                <option value="PERCENTAGE">Percentual (%)</option>
                <option value="FIXED">Fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Desconto</label>
              <input
                type="number"
                value={form.discount}
                onChange={(e) => onChange({ ...form, discount: e.target.value })}
                placeholder={form.type === 'PERCENTAGE' ? '10' : '5.00'}
                className="w-full h-10 rounded-lg border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Limite de uso</label>
              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) => onChange({ ...form, usageLimit: e.target.value })}
                placeholder="Ilimitado"
                className="w-full h-10 rounded-lg border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Expira em</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => onChange({ ...form, expiresAt: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-4 text-sm text-foreground focus:border-primary outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => onChange({ ...form, isActive: e.target.checked })}
              className="rounded border-input"
            />
            <label className="text-sm text-foreground">Ativo</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-input hover:bg-muted/50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-white font-semibold disabled:opacity-50 hover:bg-primary-light transition-colors"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  open,
  couponCode,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  couponCode: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground mb-2">Excluir cupom</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Tem certeza que deseja excluir o cupom <strong>{couponCode}</strong>? Esta acao nao pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-input hover:bg-muted/50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors"
          >
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyCouponForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCoupons = useCallback(() => {
    setLoading(true);
    apiFetch<Coupon[]>('/admin/coupons')
      .then(setCoupons)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  function openCreate() {
    setEditingCoupon(null);
    setForm(emptyCouponForm);
    setModalOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      discount: String(coupon.discount),
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      expiresAt: coupon.expiresAt ? coupon.expiresAt.split('T')[0] : '',
      isActive: coupon.isActive,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        code: form.code,
        type: form.type,
        discount: parseFloat(form.discount),
        isActive: form.isActive,
      };
      if (form.usageLimit) body.usageLimit = parseInt(form.usageLimit, 10);
      if (form.expiresAt) body.expiresAt = form.expiresAt;

      if (editingCoupon) {
        await apiFetch(`/admin/coupons/${editingCoupon.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/admin/coupons', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }

      setModalOpen(false);
      setEditingCoupon(null);
      setForm(emptyCouponForm);
      fetchCoupons();
    } catch {
      // error handling
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/coupons/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      fetchCoupons();
    } catch {
      // error handling
    } finally {
      setDeleting(false);
    }
  }

  function formatDiscount(coupon: Coupon) {
    return coupon.type === 'PERCENTAGE'
      ? `${Number(coupon.discount)}%`
      : `R$ ${Number(coupon.discount).toFixed(2)}`;
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-serif text-foreground">Cupons</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors"
        >
          Novo Cupom
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <p className="p-10 text-center text-muted-foreground">Carregando...</p>
        ) : coupons.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Nenhum cupom cadastrado</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Codigo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desconto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expira</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr
                  key={coupon.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono font-semibold text-foreground">
                    {coupon.code}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={coupon.type} />
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {formatDiscount(coupon)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ' / --'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {coupon.expiresAt
                      ? new Date(coupon.expiresAt).toLocaleDateString('pt-BR')
                      : 'Sem limite'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={coupon.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(coupon)}
                        className="px-3 py-1 text-xs font-semibold rounded-lg border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteTarget(coupon)}
                        className="px-3 py-1 text-xs font-semibold rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CouponModal
        open={modalOpen}
        title={editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
        form={form}
        onChange={setForm}
        onSubmit={handleSave}
        onCancel={() => {
          setModalOpen(false);
          setEditingCoupon(null);
          setForm(emptyCouponForm);
        }}
        loading={saving}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        couponCode={deleteTarget?.code || ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </AdminLayout>
  );
}
