import { useState, useEffect, useCallback } from 'react';
import { getAdminOrders, updateAdminOrder, type AdminOrder } from '../../api/admin';
import type { PaginationMeta } from '../../api/products';
import { formatPrice } from '../../utils/currency';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  Confirmed: 'bg-blue-100 text-blue-700',
  Shipped:   'bg-yellow-100 text-yellow-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
  Pending:   'bg-gray-100 text-gray-600',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-24">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ pagination, onPage }: { pagination: PaginationMeta; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-between items-center px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span>Page {pagination.page} of {totalPages} ({pagination.total} orders)</span>
      <div className="flex gap-2">
        <button onClick={() => onPage(pagination.page - 1)} disabled={pagination.page <= 1}
          className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Prev
        </button>
        <button onClick={() => onPage(pagination.page + 1)} disabled={pagination.page >= totalPages}
          className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Next
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const SHIPPING_STATUSES = ['Confirmed', 'Shipped'];

export default function AdminShippingPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pageSize: PAGE_SIZE, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('Confirmed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async (page: number, status: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminOrders(page, PAGE_SIZE, status);
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

  async function handleMarkShipped(order: AdminOrder) {
    setUpdatingId(order.id);
    try {
      await updateAdminOrder(order.id, 'Shipped');
      load(pagination.page, statusFilter);
    } catch {
      setError('Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleMarkDelivered(order: AdminOrder) {
    setUpdatingId(order.id);
    try {
      await updateAdminOrder(order.id, 'Delivered');
      load(pagination.page, statusFilter);
    } catch {
      setError('Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shipping</h1>
          <p className="text-sm text-gray-500 mt-1">Manage orders ready for dispatch and in transit</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mb-6">
          {SHIPPING_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-left rounded-2xl border p-4 transition-all ${statusFilter === s ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <p className="text-sm text-gray-500 mb-1">{s}</p>
              <StatusBadge status={s} />
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? <LoadingSpinner /> : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" aria-label="Shipping orders">
                <thead className="bg-gray-50">
                  <tr>
                    {['Order ID', 'Customer', 'Date', 'Items', 'Total', 'Status', 'Actions'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                          </svg>
                          <p className="text-sm text-gray-400">No {statusFilter.toLowerCase()} orders found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">#{order.id}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{order.user_name}</p>
                          <p className="text-xs text-gray-400">{order.user_email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{order.payment_method}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPrice(order.total)}</td>
                        <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            {order.status === 'Confirmed' && (
                              <button
                                onClick={() => handleMarkShipped(order)}
                                disabled={updatingId === order.id}
                                className="px-3 py-1.5 rounded-lg bg-yellow-500 text-white text-xs font-semibold hover:bg-yellow-400 disabled:opacity-50 transition-colors"
                              >
                                {updatingId === order.id ? '...' : 'Mark Shipped'}
                              </button>
                            )}
                            {order.status === 'Shipped' && (
                              <button
                                onClick={() => handleMarkDelivered(order)}
                                disabled={updatingId === order.id}
                                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-500 disabled:opacity-50 transition-colors"
                              >
                                {updatingId === order.id ? '...' : 'Mark Delivered'}
                              </button>
                            )}
                          </div>
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
