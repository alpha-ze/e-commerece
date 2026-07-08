import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOrderById, cancelOrder, type OrderDetailResult } from '../api/orders';

// ── Constants ─────────────────────────────────────────────────────────────────

/** The ordered sequence of non-cancelled statuses */
const STATUS_SEQUENCE = ['Pending', 'Confirmed', 'Shipped', 'Delivered'] as const;

const STATUS_BADGE: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  Shipped: 'bg-purple-100 text-purple-800 border-purple-200',
  Delivered: 'bg-green-100 text-green-800 border-green-200',
  Cancelled: 'bg-red-100 text-red-800 border-red-200',
};

function statusBadgeClass(status: string): string {
  return STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-700 border-gray-200';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Loading spinner ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-24" aria-label="Loading order">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

interface ErrorStateProps {
  code: number | null;
  message: string;
}

function ErrorState({ code, message }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-6xl font-bold text-gray-200 mb-4">{code ?? '!'}</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {code === 404 ? 'Order Not Found' : code === 403 ? 'Access Denied' : 'Something went wrong'}
      </h2>
      <p className="text-gray-500 mb-6 max-w-sm">{message}</p>
      <Link
        to="/orders"
        className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition-colors"
      >
        Back to Orders
      </Link>
    </div>
  );
}

// ── Status tracker ────────────────────────────────────────────────────────────

interface StatusTrackerProps {
  status: string;
}

function StatusTracker({ status }: StatusTrackerProps) {
  const isCancelled = status === 'Cancelled';
  const currentIndex = STATUS_SEQUENCE.indexOf(status as (typeof STATUS_SEQUENCE)[number]);

  if (isCancelled) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Order Status</h2>
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center" aria-hidden="true">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-red-800">Order Cancelled</p>
            <p className="text-xs text-red-600 mt-0.5">This order has been cancelled.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Order Status</h2>

      {/* Step tracker */}
      <div className="relative" aria-label="Order progress">
        {/* Connector line behind steps */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" aria-hidden="true">
          <div
            className="h-full bg-indigo-600 transition-all duration-500"
            style={{
              width:
                currentIndex <= 0
                  ? '0%'
                  : `${(currentIndex / (STATUS_SEQUENCE.length - 1)) * 100}%`,
            }}
          />
        </div>

        <ol className="relative flex justify-between">
          {STATUS_SEQUENCE.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <li
                key={step}
                className="flex flex-col items-center gap-2 flex-1"
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* Circle */}
                <span
                  className={`relative z-10 flex w-8 h-8 items-center justify-center rounded-full border-2 transition-colors ${
                    isCompleted
                      ? 'bg-indigo-600 border-indigo-600'
                      : isCurrent
                        ? 'bg-white border-indigo-600'
                        : 'bg-white border-gray-300'
                  }`}
                  aria-hidden="true"
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isCurrent ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </span>

                {/* Label */}
                <span
                  className={`text-xs font-medium text-center leading-tight ${
                    isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                  } ${isCurrent ? 'font-semibold' : ''}`}
                >
                  {step}
                </span>

                {/* "Current" indicator */}
                {isCurrent && (
                  <span className="text-xs text-indigo-600 font-medium -mt-1">
                    Current
                  </span>
                )}

                {/* Screen-reader text */}
                <span className="sr-only">
                  {isCompleted ? `${step}: completed` : isCurrent ? `${step}: current step` : `${step}: pending`}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Unknown / future status fallback */}
      {currentIndex === -1 && (
        <div className="mt-4 text-center">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${statusBadgeClass(status)}`}
          >
            {status}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ── Items table ───────────────────────────────────────────────────────────────

function ItemsTable({ order }: { order: OrderDetailResult }) {
  return (
    <Section title="Items Ordered">
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="min-w-full" aria-label="Order items">
          <thead>
            <tr className="border-b border-gray-100">
              <th
                scope="col"
                className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Product
              </th>
              <th
                scope="col"
                className="pb-3 px-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Qty
              </th>
              <th
                scope="col"
                className="pb-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Unit Price
              </th>
              <th
                scope="col"
                className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3.5 pr-4 text-sm font-medium text-gray-900">
                  {item.product_name}
                </td>
                <td className="py-3.5 px-4 text-center text-sm text-gray-500">
                  {item.quantity}
                </td>
                <td className="py-3.5 px-4 text-right text-sm text-gray-500">
                  ${parseFloat(item.unit_price).toFixed(2)}
                </td>
                <td className="py-3.5 text-right text-sm font-semibold text-gray-900">
                  ${parseFloat(item.subtotal).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ── Totals card ───────────────────────────────────────────────────────────────

function TotalsCard({ order }: { order: OrderDetailResult }) {
  const subtotal = parseFloat(order.subtotal);
  const tax = parseFloat(order.tax);
  const discount = parseFloat(order.discount);
  const total = parseFloat(order.total);

  return (
    <Section title="Order Totals">
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Subtotal</dt>
          <dd className="font-medium text-gray-900">${subtotal.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Tax</dt>
          <dd className="font-medium text-gray-900">${tax.toFixed(2)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <dt className="text-gray-500">Discount</dt>
            <dd className="font-medium text-green-600">−${discount.toFixed(2)}</dd>
          </div>
        )}
        <div className="flex justify-between pt-3 border-t border-gray-100">
          <dt className="font-bold text-gray-900 text-base">Total</dt>
          <dd className="font-bold text-gray-900 text-base">${total.toFixed(2)}</dd>
        </div>
      </dl>
    </Section>
  );
}

// ── Shipping & payment card ───────────────────────────────────────────────────

function ShippingPaymentCard({ order }: { order: OrderDetailResult }) {
  return (
    <Section title="Shipping & Payment">
      <div className="space-y-5">
        {/* Shipping address */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Shipping Address
          </p>
          {order.address ? (
            <address className="not-italic text-sm text-gray-700 space-y-0.5">
              <p>{order.address.street}</p>
              <p>
                {order.address.city}, {order.address.state} {order.address.postal_code}
              </p>
              <p>{order.address.country}</p>
            </address>
          ) : (
            <p className="text-sm text-gray-400 italic">Address not available</p>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* Payment method */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Payment Method
          </p>
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-900">{order.payment_method}</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const handleCancel = useCallback(async () => {
    if (!order) return;
    setCancelling(true);
    setCancelError('');
    try {
      const updated = await cancelOrder(order.id);
      setOrder(updated);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Failed to cancel order.';
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  }, [order]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);
    setErrorCode(null);
    setErrorMsg('');

    getOrderById(Number(id))
      .then((data) => {
        if (cancelled) return;
        setOrder(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const axiosErr = err as {
          response?: { status?: number; data?: { error?: { message?: string } } };
        };
        const code = axiosErr?.response?.status ?? null;
        const msg =
          axiosErr?.response?.data?.error?.message ??
          (code === 404
            ? 'This order does not exist.'
            : code === 403
              ? 'You do not have permission to view this order.'
              : 'Failed to load order details. Please try again.');
        setErrorCode(code);
        setErrorMsg(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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
              <li>
                <Link to="/orders" className="hover:text-indigo-600 transition-colors">
                  Orders
                </Link>
              </li>
              <li aria-hidden="true">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </li>
              <li className="text-gray-900 font-medium" aria-current="page">
                Order #{id}
              </li>
            </ol>
          </nav>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Order Details
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              {order && (
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${statusBadgeClass(order.status)}`}
                >
                  {order.status}
                </span>
              )}
              {order && ['Pending', 'Confirmed'].includes(order.status) && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-4 py-1.5 rounded-lg border border-red-300 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              )}
            </div>
          </div>
          {cancelError && (
            <p className="mt-2 text-sm text-red-600">{cancelError}</p>
          )}

          {order && (
            <p className="mt-1 text-sm text-gray-500">
              Placed on {formatDate(order.created_at)}
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && <LoadingSpinner />}

        {/* Error */}
        {!loading && errorMsg && (
          <ErrorState code={errorCode} message={errorMsg} />
        )}

        {/* Content */}
        {!loading && order && (
          <div className="space-y-6">
            {/* Status tracker */}
            <StatusTracker status={order.status} />

            {/* Items */}
            <ItemsTable order={order} />

            {/* Bottom grid: shipping/payment + totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ShippingPaymentCard order={order} />
              <TotalsCard order={order} />
            </div>

            {/* Back link */}
            <div>
              <Link
                to="/orders"
                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Order History
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
