import { useState, useEffect, useCallback } from 'react';
import { getCoupons, createCoupon, deleteCoupon, type Coupon, type CreateCouponPayload } from '../../api/admin';
import { formatPrice } from '../../utils/currency';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-24">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateCouponPayload = {
  code: '',
  discount_type: 'percentage',
  discount_value: 0,
  expires_at: '',
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CreateCouponPayload>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCoupons(await getCoupons());
    } catch {
      setError('Failed to load coupons.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowCreate(true);
  }

  async function handleCreate() {
    if (!form.code.trim()) { setFormError('Code is required.'); return; }
    if (!form.discount_value || form.discount_value <= 0) { setFormError('Discount value must be > 0.'); return; }
    if (!form.expires_at) { setFormError('Expiry date is required.'); return; }
    setSaving(true); setFormError('');
    try {
      await createCoupon(form);
      setShowCreate(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to create coupon.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteCoupon(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch {
      setError('Failed to delete coupon.');
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof CreateCouponPayload>(key: K, value: CreateCouponPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Coupons</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Coupon
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading && <LoadingSpinner />}

        {!loading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" aria-label="Coupons table">
                <thead className="bg-gray-50">
                  <tr>
                    {['Code', 'Type', 'Value', 'Expires', 'Active', 'Actions'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">No coupons yet.</td>
                    </tr>
                  ) : (
                    coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">{c.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{c.discount_type}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {c.discount_type === 'percentage'
                            ? `${parseFloat(c.discount_value).toFixed(0)}%`
                            : formatPrice(c.discount_value)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(c.expires_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button onClick={() => setDeleteTarget(c)} className="text-red-600 hover:text-red-500 font-medium transition-colors">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Add Coupon" onClose={() => setShowCreate(false)}>
          {formError && <div role="alert" className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setField('code', e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setField('discount_type', e.target.value as 'percentage' | 'fixed')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.discount_value || ''}
                  onChange={(e) => setField('discount_value', parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At *</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setField('expires_at', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <Modal title="Delete Coupon" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-gray-700 mb-6">
            Delete coupon <span className="font-mono font-semibold">{deleteTarget.code}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="px-4 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors">
              {saving ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
