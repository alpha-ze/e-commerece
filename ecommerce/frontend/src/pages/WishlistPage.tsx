import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getWishlist, removeFromWishlist, type WishlistItemResult } from '../api/wishlist';
import { formatPrice } from '../utils/currency';

// ── Loading spinner ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-24" aria-label="Loading wishlist">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyWishlist() {
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
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
      <p className="text-gray-500 mb-6">
        Save items you love and come back to them anytime.
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

// ── Wishlist item card ────────────────────────────────────────────────────────

interface WishlistItemCardProps {
  item: WishlistItemResult;
  removing: boolean;
  onRemove: (productId: number) => void;
}

function WishlistItemCard({ item, removing, onRemove }: WishlistItemCardProps) {
  const effectivePrice = item.discount_price
    ? parseFloat(item.discount_price)
    : parseFloat(item.price);
  const originalPrice = parseFloat(item.price);
  const hasDiscount =
    item.discount_price !== null && parseFloat(item.discount_price!) < originalPrice;

  return (
    <div
      className={`flex gap-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4 transition-opacity ${
        removing ? 'opacity-50 pointer-events-none' : ''
      }`}
      aria-busy={removing}
    >
      {/* Product image */}
      <Link
        to={`/products/${item.product_id}`}
        className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
        tabIndex={-1}
        aria-hidden="true"
      >
        {item.primary_image ? (
          <img
            src={item.primary_image}
            alt={item.product_name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
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
            <span className="text-base font-bold text-gray-900">
              {formatPrice(effectivePrice)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to={`/products/${item.product_id}`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
          >
            View Product
          </Link>
          <button
            type="button"
            onClick={() => onRemove(item.product_id)}
            disabled={removing}
            aria-label={`Remove ${item.product_name} from wishlist`}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItemResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

  // ── Fetch wishlist on mount ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getWishlist();
        if (!cancelled) {
          setItems(data.items);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load wishlist. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Remove handler ──────────────────────────────────────────────────────
  const handleRemove = useCallback(async (productId: number) => {
    setRemovingIds((prev) => new Set(prev).add(productId));
    try {
      await removeFromWishlist(productId);
      setItems((prev) => prev.filter((item) => item.product_id !== productId));
    } catch {
      setError('Failed to remove item. Please try again.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                Wishlist
              </li>
            </ol>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Wishlist
            {items.length > 0 && (
              <span className="ml-2 text-lg font-normal text-gray-400">
                ({items.length} {items.length === 1 ? 'item' : 'items'})
              </span>
            )}
          </h1>
        </div>

        {/* Error banner */}
        {error && (
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
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && <LoadingSpinner />}

        {/* Loaded: empty */}
        {!loading && !error && items.length === 0 && <EmptyWishlist />}

        {/* Loaded: has items */}
        {!loading && items.length > 0 && (
          <div role="list" aria-label="Wishlist items" className="space-y-4">
            {items.map((item) => (
              <div key={item.id} role="listitem">
                <WishlistItemCard
                  item={item}
                  removing={removingIds.has(item.product_id)}
                  onRemove={handleRemove}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
