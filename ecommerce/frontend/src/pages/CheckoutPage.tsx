import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAddresses, type AddressResult } from '../api/profile';
import { createOrder } from '../api/orders';
import { useCart } from '../hooks/useCart';
import { formatPrice } from '../utils/currency';

// ── Loading spinner ───────────────────────────────────────────────────────────

function LoadingSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex justify-center items-center py-10" aria-label={label}>
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

// ── Address card ──────────────────────────────────────────────────────────────

interface AddressCardProps {
  address: AddressResult;
  selected: boolean;
  onSelect: (id: number) => void;
}

function AddressCard({ address, selected, onSelect }: AddressCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(address.id)}
      aria-pressed={selected}
      className={`w-full text-left rounded-xl border-2 p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${
        selected
          ? 'border-indigo-600 bg-indigo-50'
          : 'border-gray-200 bg-white hover:border-indigo-300'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Radio indicator */}
        <span
          className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            selected ? 'border-indigo-600' : 'border-gray-400'
          }`}
          aria-hidden="true"
        >
          {selected && (
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          )}
        </span>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {address.street}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {address.city}, {address.state} {address.postal_code}
          </p>
          <p className="text-sm text-gray-500">{address.country}</p>
          {address.is_default && (
            <span className="mt-1 inline-block text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
              Default
            </span>
          )}
        </div>
      </div>
    </button>
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, loading: cartLoading, refreshCart } = useCart();

  // ── Address state ────────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState<AddressResult[]>([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressError, setAddressError] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  // ── Coupon state ─────────────────────────────────────────────────────────
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');

  // ── Order state ──────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  // ── Load addresses ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setAddressLoading(true);
    setAddressError('');

    getAddresses()
      .then((data) => {
        if (cancelled) return;
        setAddresses(data);
        // Pre-select default address if one exists
        const defaultAddr = data.find((a) => a.is_default);
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        else if (data.length > 0) setSelectedAddressId(data[0].id);
      })
      .catch(() => {
        if (cancelled) return;
        setAddressError('Failed to load addresses. Please try again.');
      })
      .finally(() => {
        if (cancelled) return;
        setAddressLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────
  const items = cart?.items ?? [];
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartEmpty = !cartLoading && items.length === 0;
  const canSubmit =
    !submitting &&
    !cartLoading &&
    !cartEmpty &&
    selectedAddressId !== null;

  // ── Apply coupon handler ─────────────────────────────────────────────────
  function handleApplyCoupon() {
    const trimmed = couponInput.trim();
    if (trimmed) {
      setAppliedCoupon(trimmed);
    }
  }

  function handleCouponKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleApplyCoupon();
  }

  // ── Submit handler ───────────────────────────────────────────────────────
  async function handleConfirmOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || selectedAddressId === null) return;

    setSubmitting(true);
    setOrderError('');

    try {
      const order = await createOrder({
        address_id: selectedAddressId,
        payment_method: 'Cash on Delivery',
        coupon_code: appliedCoupon || undefined,
      });
      await refreshCart();
      navigate(`/orders/${order.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      setOrderError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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
                <Link to="/cart" className="hover:text-indigo-600 transition-colors">
                  Cart
                </Link>
              </li>
              <li aria-hidden="true">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </li>
              <li className="text-gray-900 font-medium" aria-current="page">
                Checkout
              </li>
            </ol>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        {/* Error banner */}
        {orderError && (
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
            {orderError}
          </div>
        )}

        <form onSubmit={handleConfirmOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left column: address + coupon + payment ──────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Delivery Address */}
              <Section title="Delivery Address">
                {addressLoading ? (
                  <LoadingSpinner label="Loading addresses" />
                ) : addressError ? (
                  <p className="text-sm text-red-600">{addressError}</p>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-3">No saved addresses found.</p>
                    <Link
                      to="/profile"
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      Add an address in your profile →
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Select delivery address">
                    {addresses.map((addr) => (
                      <AddressCard
                        key={addr.id}
                        address={addr}
                        selected={selectedAddressId === addr.id}
                        onSelect={setSelectedAddressId}
                      />
                    ))}
                  </div>
                )}
              </Section>

              {/* Coupon */}
              <Section title="Coupon Code">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={handleCouponKeyDown}
                    placeholder="Enter coupon code"
                    aria-label="Coupon code"
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={!couponInput.trim()}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
                {appliedCoupon && (
                  <div className="mt-3 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-green-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-green-700 font-medium">
                      Coupon <span className="font-bold">{appliedCoupon}</span> applied
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon('');
                        setCouponInput('');
                      }}
                      className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove coupon"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </Section>

              {/* Payment method */}
              <Section title="Payment Method">
                <div
                  className="flex items-center gap-3 rounded-xl border-2 border-indigo-600 bg-indigo-50 p-4"
                  role="radiogroup"
                  aria-label="Payment method"
                >
                  {/* Radio indicator — always selected */}
                  <span
                    className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-indigo-600 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  </span>

                  {/* CoD icon */}
                  <svg
                    className="w-5 h-5 text-indigo-600 flex-shrink-0"
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

                  <div>
                    <p className="text-sm font-semibold text-gray-900">Cash on Delivery</p>
                    <p className="text-xs text-gray-500 mt-0.5">Pay when your order arrives</p>
                  </div>
                </div>
              </Section>
            </div>

            {/* ── Right column: order summary + confirm ─────────────────── */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Order Summary</h2>

                {/* Cart items list */}
                {cartLoading ? (
                  <LoadingSpinner label="Loading cart" />
                ) : cartEmpty ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">Your cart is empty.</p>
                    <Link
                      to="/products"
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      Browse products →
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Items */}
                    <ul className="divide-y divide-gray-100 mb-4" aria-label="Items in your order">
                      {items.map((item) => {
                        const price = item.discount_price
                          ? parseFloat(item.discount_price)
                          : parseFloat(item.price);
                        return (
                          <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                            {/* Thumbnail */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.product_name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg
                                    className="w-5 h-5 text-gray-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1.5}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>

                            {/* Name + qty */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 line-clamp-1">
                                {item.product_name}
                              </p>
                              <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                            </div>

                            {/* Line total */}
                            <span className="text-xs font-semibold text-gray-900 flex-shrink-0">
                              {formatPrice(price * item.quantity)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Totals */}
                    <dl className="space-y-2 text-sm border-t border-gray-100 pt-4">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">
                          Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                        </dt>
                        <dd className="font-medium text-gray-900">
                          {formatPrice(cart!.subtotal)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Tax</dt>
                        <dd className="font-medium text-gray-900">{formatPrice(cart!.tax)}</dd>
                      </div>
                      <div className="flex justify-between pt-3 border-t border-gray-100">
                        <dt className="font-bold text-gray-900 text-base">Total</dt>
                        <dd className="font-bold text-gray-900 text-base">
                          {formatPrice(cart!.total)}
                        </dd>
                      </div>
                    </dl>

                    {/* Confirm button */}
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      aria-disabled={!canSubmit}
                      className="mt-6 w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-center text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                            aria-hidden="true"
                          />
                          Placing Order…
                        </>
                      ) : (
                        'Confirm Order'
                      )}
                    </button>

                    {!selectedAddressId && !addressLoading && addresses.length > 0 && (
                      <p className="mt-2 text-xs text-center text-amber-600">
                        Please select a delivery address
                      </p>
                    )}
                    {cartEmpty && (
                      <p className="mt-2 text-xs text-center text-amber-600">
                        Your cart is empty
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
