import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { type CartItemResult } from '../api/cart';
import { useCart } from '../hooks/useCart';
import { formatPrice } from '../utils/currency';

// ── Loading spinner ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-24" aria-label="Loading cart">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyCart() {
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
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
      <p className="text-gray-500 mb-6">
        Looks like you haven't added anything yet. Start shopping to fill it up!
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

// ── Quantity control ──────────────────────────────────────────────────────────

interface QuantityControlProps {
  value: number;
  max: number;
  disabled: boolean;
  onChange: (newQty: number) => void;
}

function QuantityControl({ value, max, disabled, onChange }: QuantityControlProps) {
  const [inputValue, setInputValue] = useState(String(value));

  // Keep input in sync when value changes externally
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  function handleDecrement() {
    if (value > 1) onChange(value - 1);
  }

  function handleIncrement() {
    if (value < max) onChange(value + 1);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
  }

  function handleInputBlur() {
    const parsed = parseInt(inputValue, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= max) {
      onChange(parsed);
    } else {
      // Revert to current value
      setInputValue(String(value));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  return (
    <div
      className="flex items-center border border-gray-300 rounded-lg overflow-hidden"
      aria-label="Quantity control"
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= 1}
        aria-label="Decrease quantity"
        className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <input
        type="number"
        min={1}
        max={max}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={`Quantity: ${value}`}
        className="w-14 text-center py-2 text-sm font-medium text-gray-900 border-x border-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

// ── Cart item row ─────────────────────────────────────────────────────────────

interface CartItemRowProps {
  item: CartItemResult;
  updating: boolean;
  onQuantityChange: (itemId: number, qty: number) => void;
  onRemove: (itemId: number) => void;
}

function CartItemRow({ item, updating, onQuantityChange, onRemove }: CartItemRowProps) {
  const effectivePrice = item.discount_price
    ? parseFloat(item.discount_price)
    : parseFloat(item.price);
  const originalPrice = parseFloat(item.price);
  const hasDiscount =
    item.discount_price !== null && parseFloat(item.discount_price!) < originalPrice;
  const lineTotal = effectivePrice * item.quantity;

  return (
    <div
      className={`flex gap-4 py-5 first:pt-0 last:pb-0 border-b last:border-b-0 border-gray-100 transition-opacity ${
        updating ? 'opacity-50 pointer-events-none' : ''
      }`}
      aria-busy={updating}
    >
      {/* Product image */}
      <Link
        to={`/products/${item.product_id}`}
        className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
        tabIndex={-1}
        aria-hidden="true"
      >
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
              className="w-8 h-8 text-gray-300"
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
      </Link>

      {/* Item details */}
      <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3 min-w-0">
        {/* Name + price */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/products/${item.product_id}`}
            className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-2"
          >
            {item.product_name}
          </Link>
          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            <span className="text-sm font-bold text-gray-900">
              {formatPrice(effectivePrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
          {/* Stock warning for low-stock items */}
          {item.stock > 0 && item.stock <= 5 && (
            <span className="text-xs text-amber-600 font-medium">
              Only {item.stock} left in stock
            </span>
          )}
        </div>

        {/* Controls: quantity + remove + line total */}
        <div className="flex items-center gap-4 flex-wrap">
          <QuantityControl
            value={item.quantity}
            max={item.stock || 99}
            disabled={updating}
            onChange={(qty) => onQuantityChange(item.id, qty)}
          />

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={updating}
            aria-label={`Remove ${item.product_name} from cart`}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>

          <span className="text-sm font-semibold text-gray-900 min-w-[4rem] text-right">
            {formatPrice(lineTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Order summary sidebar ─────────────────────────────────────────────────────

interface OrderSummaryProps {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  loading: boolean;
}

function OrderSummary({ subtotal, tax, total, itemCount, loading }: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-6">
      <h2 className="text-lg font-bold text-gray-900 mb-5">Order Summary</h2>

      <dl
        className={`space-y-3 text-sm transition-opacity ${loading ? 'opacity-50' : ''}`}
      >
        <div className="flex justify-between">
          <dt className="text-gray-500">
            Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </dt>
          <dd className="font-medium text-gray-900">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Tax</dt>
          <dd className="font-medium text-gray-900">{formatPrice(tax)}</dd>
        </div>
        <div className="flex justify-between pt-3 border-t border-gray-100">
          <dt className="font-bold text-gray-900 text-base">Total</dt>
          <dd className="font-bold text-gray-900 text-base">{formatPrice(total)}</dd>
        </div>
      </dl>

      {/* Checkout CTA — placeholder until task 7.3 */}
      <Link
        to="/checkout"
        className="mt-6 block w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-center text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition-colors"
        aria-disabled={itemCount === 0}
        tabIndex={itemCount === 0 ? -1 : 0}
      >
        Proceed to Checkout
      </Link>

      <Link
        to="/products"
        className="mt-3 block w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
      >
        Continue Shopping
      </Link>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CartPage() {
  const { cart, loading, error: cartError, updateItem, removeItem } = useCart();

  // Local error state for mutation failures (displayed temporarily)
  const [localError, setLocalError] = useState('');
  // Track which item IDs are currently being updated
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());

  // Show cart-level errors from context as local error
  useEffect(() => {
    if (cartError) {
      setLocalError(cartError);
      const timer = setTimeout(() => setLocalError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [cartError]);

  // ── Quantity change handler ──────────────────────────────────────────────────
  const handleQuantityChange = useCallback(
    async (itemId: number, newQty: number) => {
      setUpdatingIds((prev) => new Set(prev).add(itemId));
      try {
        await updateItem(itemId, newQty);
      } catch {
        setLocalError('Failed to update quantity. Please try again.');
        setTimeout(() => setLocalError(''), 4000);
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    },
    [updateItem]
  );

  // ── Remove handler ──────────────────────────────────────────────────────────
  const handleRemove = useCallback(
    async (itemId: number) => {
      setUpdatingIds((prev) => new Set(prev).add(itemId));
      try {
        await removeItem(itemId);
      } catch {
        setLocalError('Failed to remove item. Please try again.');
        setTimeout(() => setLocalError(''), 4000);
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    },
    [removeItem]
  );

  // ── Derived values ──────────────────────────────────────────────────────────
  const itemCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
  const isSummaryUpdating = updatingIds.size > 0;
  const displayError = localError || cartError;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
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
                Shopping Cart
              </li>
            </ol>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Shopping Cart
            {cart && cart.items.length > 0 && (
              <span className="ml-2 text-lg font-normal text-gray-400">
                ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </h1>
        </div>

        {/* Error banner */}
        {displayError && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2"
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
            {displayError}
          </div>
        )}

        {/* Loading state */}
        {loading && <LoadingSpinner />}

        {/* Loaded: empty */}
        {!loading && cart && cart.items.length === 0 && <EmptyCart />}

        {/* Loaded: has items */}
        {!loading && cart && cart.items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Cart items list ─────────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div role="list" aria-label="Cart items">
                  {cart.items.map((item) => (
                    <div key={item.id} role="listitem">
                      <CartItemRow
                        item={item}
                        updating={updatingIds.has(item.id)}
                        onQuantityChange={handleQuantityChange}
                        onRemove={handleRemove}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Order summary ───────────────────────────────────────────── */}
            <div>
              <OrderSummary
                subtotal={cart.subtotal}
                tax={cart.tax}
                total={cart.total}
                itemCount={itemCount}
                loading={isSummaryUpdating}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
