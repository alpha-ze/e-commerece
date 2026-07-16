import { useState, useEffect, useCallback } from 'react';
import {
  getAdminOrders,
  updateAdminOrder,
  type AdminOrder,
} from '../../api/admin';
import type { PaginationMeta } from '../../api/products';
import { formatPrice } from '../../utils/currency';

// ── Constants ─────────────────────────────────────────────────────────────────

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Shipped: 'bg-purple-100 text-purple-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

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

function Pagination({ pagination, onPage }: { pagination: PaginationMeta; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-between items-center px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span>Page {pagination.page} of {totalPages} ({pagination.total} orders)</span>
      <div className="flex gap-2">
        <button onClick={() => onPage(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Prev</button>
        <button onClick={() => onPage(pagination.page + 1)} disabled={pagination.page >= totalPages} className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pageSize: PAGE_SIZE, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async (page: number, status: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminOrders(page, PAGE_SIZE, status || undefined);
      setOrders(result.orders);
      setPagination(result.pagination);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1, statusFilter);
  }, [load, statusFilter]);

  async function handleStatusChange(orderId: number, newStatus: string) {
    setUpdatingId(orderId);
    try {
      const updated = await updateAdminOrder(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)));
    } catch {
      setError('Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600" htmlFor="status-filter">Filter by status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">All</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading && <LoadingSpinner />}

        {!loading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" aria-label="Orders table">
                <thead className="bg-gray-50">
                  <tr>
                    {['Order', 'Customer', 'Date', 'Total', 'Status', 'Update Status'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">No orders found.</td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">#{o.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>{o.user_name}</div>
                          <div className="text-xs text-gray-400">{o.user_email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(o.created_at)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPrice(o.total)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={o.status}
                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                            disabled={updatingId === o.id}
                            aria-label={`Update status for order #${o.id}`}
                            className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPage={(p) => load(p, statusFilter)} />
          </div>
        )}
      </div>
    </div>
  );
}
