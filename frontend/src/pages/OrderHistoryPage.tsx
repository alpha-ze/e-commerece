import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, cancelOrder, type OrderSummary, type OrderPaginationMeta } from '../api/orders';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  Pending:          'bg-yellow-100 text-yellow-800 border-yellow-200',
  Confirmed:        'bg-blue-100 text-blue-800 border-blue-200',
  Shipped:          'bg-purple-100 text-purple-800 border-purple-200',
  Delivered:        'bg-green-100 text-green-800 border-green-200',
  Cancelled:        'bg-red-100 text-red-800 border-red-200',
  Return_Requested: 'bg-orange-100 text-orange-800 border-orange-200',
  Returned:         'bg-gray-100 text-gray-700 border-gray-200',
};

function statusBadgeClass(status: string): string {
  return (
    STATUS_STYLES[status] ??
    'bg-gray-100 text-gray-700 border-gray-200'
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ── Loading spinner ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-24" aria-label="Loading orders">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyOrders() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <svg
        className="w-20 h-20 text-gray-300 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
      <p className="text-gray-500 mb-6">
        You haven't placed any orders. Start shopping to see them here.
      </p>
      <Link
        to="/products"
        className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition-colors"
      >
        Browse Products
      </Link>
    </div>
  );
}

// ── Order row ─────────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: OrderSummary;
  onCancelled: () => void;
}

function OrderRow({ order, onCancelled }: OrderRowProps) {
  const badgeClass = statusBadgeClass(order.status);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const canCancel = order.status === 'Pending' || order.status === 'Confirmed';

  async function handleCancel() {
    if (!window.confirm(`Cancel order #${order.id}?`)) return;
    setCancelling(true);
    setCancelError('');
    try {
      await cancelOrder(order.id);
      onCancelled();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Failed to cancel order.';
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="py-4 pl-6 pr-3 text-sm font-medium text-gray-900 whitespace-nowrap">
          #{order.id}
        </td>
        <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
          {formatDate(order.created_at)}
        </td>
        <td className="px-3 py-4 text-sm whitespace-nowrap">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
          >
            {order.status}
          </span>
        </td>
        <td className="px-3 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap text-right">
          ${parseFloat(order.total).toFixed(2)}
        </td>
        <td className="py-4 pl-3 pr-6 text-sm text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-3">
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="font-medium text-red-600 hover:text-red-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 rounded"
              >
                {cancelling ? 'Cancelling…' : 'Cancel'}
              </button>
            )}
            <Link
              to={`/orders/${order.id}`}
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 rounded"
            >
              View Details
            </Link>
          </div>
        </td>
      </tr>
      {cancelError && (
        <tr>
          <td colSpan={5} className="px-6 pb-3 text-xs text-red-600">
            {cancelError}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Pagination controls ───────────────────────────────────────────────────────

interface PaginationProps {
  pagination: OrderPaginationMeta;
  onPageChange: (page: number) => void;
}

function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { page, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (totalPages <= 1) return null;

  // Build page numbers: always show first, last, current ±1, with ellipsis
  const pages: (number | '…')[] = [];
  const range = new Set<number>();
  range.add(1);
  range.add(totalPages);
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) {
    range.add(i);
  }
  const sorted = [...range].sort((a, b) => a - b);
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) pages.push('…');
    pages.push(p);
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-900">{from}</span>–
        <span className="font-medium text-gray-900">{to}</span> of{' '}
        <span className="font-medium text-gray-900">{total}</span> orders
      </p>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p as number)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                p === page
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </nav>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [pagination, setPagination] = useState<OrderPaginationMeta>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await getOrders(page, PAGE_SIZE);
      setOrders(result.orders);
      setPagination(result.pagination);
    } catch {
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  function handlePageChange(page: number) {
    loadOrders(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb + header */}
        <div className="mb-6">
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex items-center gap-2 text-sm text-gray-500">
              <li>
                <Link to="/" className="hover:text-indigo-600 transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </li>
              <li className="text-gray-900 font-medium" aria-current="page">
                Order History
              </li>
            </ol>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Order History</h1>
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2"
          >
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingSpinner />}

        {/* Empty */}
        {!loading && !error && orders.length === 0 && <EmptyOrders />}

        {/* Orders table */}
        {!loading && orders.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" aria-label="Order history">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Order
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Total
                    </th>
                    <th scope="col" className="py-3.5 pl-3 pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      onCancelled={() => loadOrders(pagination.page)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination pagination={pagination} onPageChange={handlePageChange} />
          </div>
        )}
      </div>
    </div>
  );
}
