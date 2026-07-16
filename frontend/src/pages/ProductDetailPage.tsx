import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProductById } from '../api/products';
import type { ProductDetail, ProductImage } from '../api/products';
import { CartContext } from '../context/CartContext';
import { formatPrice } from '../utils/currency';
import axios from 'axios';

// ── Loading spinner ──────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-24" aria-label="Loading product">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

// ── Star rating (full-size) ──────────────────────────────────────────────────
function StarRating({ rating, size = 'md' }: { rating: string | null; size?: 'sm' | 'md' }) {
  const value = rating ? parseFloat(rating) : 0;
  const fullStars = Math.floor(value);
  const hasHalf = value - fullStars >= 0.5;
  const starClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-1" aria-label={`Rating: ${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < fullStars) {
          return (
            <svg key={i} className={`${starClass} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          );
        }
        if (i === fullStars && hasHalf) {
          return (
            <span key={i} className={`relative ${starClass}`}>
              <svg className={`${starClass} text-gray-300 absolute`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <svg
                className={`${starClass} text-yellow-400 absolute overflow-hidden`}
                style={{ clipPath: 'inset(0 50% 0 0)' }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </span>
          );
        }
        return (
          <svg key={i} className={`${starClass} text-gray-300`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      })}
      {rating && (
        <span className="text-sm text-gray-500 ml-1">{parseFloat(rating).toFixed(1)}</span>
      )}
    </div>
  );
}

// ── Image gallery ────────────────────────────────────────────────────────────
function ImageGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  // Sort: primary first, then by sort_order
  const sorted = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  const [activeUrl, setActiveUrl] = useState<string | null>(
    sorted.length > 0 ? sorted[0].url : null
  );

  if (sorted.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center">
        <svg
          className="w-24 h-24 text-gray-300"
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
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main image */}
      <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
        <img
          src={activeUrl ?? sorted[0].url}
          alt={productName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div className="flex gap-3 flex-wrap" role="list" aria-label="Product images">
          {sorted.map((img) => (
            <button
              key={img.id}
              type="button"
              role="listitem"
              onClick={() => setActiveUrl(img.url)}
              aria-label={`View image ${img.sort_order + 1}`}
              aria-pressed={activeUrl === img.url}
              className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                activeUrl === img.url
                  ? 'border-indigo-500'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────
function Breadcrumb({ productName }: { productName: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
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
          <Link to="/products" className="hover:text-indigo-600 transition-colors">
            Products
          </Link>
        </li>
        <li aria-hidden="true">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </li>
        <li className="text-gray-900 font-medium truncate max-w-xs" aria-current="page">
          {productName}
        </li>
      </ol>
    </nav>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  // Cart placeholder state
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);

  const cartCtx = useContext(CartContext);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError('');

    fetchProductById(Number(id))
      .then((data) => {
        if (!cancelled) {
          setProduct(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoading(false);
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            setNotFound(true);
          } else {
            setError('Failed to load product. Please try again.');
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Reset quantity when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setCartMessage('');
    }
  }, [product]);

  async function handleAddToCart() {
    if (!product || !cartCtx) return;
    setAddingToCart(true);
    try {
      await cartCtx.addItem(product.id, quantity);
      setCartMessage(`Added ${quantity} × "${product.name}" to cart!`);
      setTimeout(() => setCartMessage(''), 3000);
    } catch {
      setCartMessage('Failed to add to cart. Please try again.');
      setTimeout(() => setCartMessage(''), 3000);
    } finally {
      setAddingToCart(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Product not found</h1>
            <p className="text-gray-500 mb-6">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/products"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
            >
              Back to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-lg bg-red-50 border border-red-200 px-6 py-4 text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  // ── Derived display values ─────────────────────────────────────────────────
  const originalPrice = parseFloat(product.price);
  const effectivePrice = product.discount_price
    ? parseFloat(product.discount_price)
    : originalPrice;
  const hasDiscount =
    product.discount_price !== null && parseFloat(product.discount_price!) < originalPrice;
  const discountPct = hasDiscount
    ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
    : 0;
  const isOutOfStock = product.stock === 0;
  const lowStock = !isOutOfStock && product.stock <= 5;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb productName={product.name} />

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* ── Left: image gallery ──────────────────────────────────── */}
            <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-gray-100">
              <ImageGallery images={product.images} productName={product.name} />
            </div>

            {/* ── Right: product info ──────────────────────────────────── */}
            <div className="p-6 lg:p-8 flex flex-col gap-5">
              {/* Category */}
              {product.category_name && (
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">
                  {product.category_name}
                </span>
              )}

              {/* Name */}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              {product.avg_rating !== null ? (
                <div className="flex items-center gap-2">
                  <StarRating rating={product.avg_rating} />
                  <span className="text-sm text-gray-500">
                    ({parseFloat(product.avg_rating).toFixed(1)} / 5)
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No reviews yet</p>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-bold text-gray-900">
                  {formatPrice(effectivePrice)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-gray-400 line-through">
                      {formatPrice(originalPrice)}
                    </span>
                    <span className="bg-green-100 text-green-700 text-sm font-semibold px-2 py-0.5 rounded-full">
                      -{discountPct}%
                    </span>
                  </>
                )}
              </div>

              {/* Stock status */}
              <div>
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    Out of Stock
                  </span>
                ) : lowStock ? (
                  <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    Only {product.stock} left in stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    In Stock ({product.stock} available)
                  </span>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Description */}
              {product.description && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Description
                  </h2>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Add to cart section */}
              {isOutOfStock ? (
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-500 text-center">
                  This product is currently out of stock.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Quantity selector */}
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="quantity"
                      className="text-sm font-medium text-gray-700 whitespace-nowrap"
                    >
                      Quantity
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        aria-label="Decrease quantity"
                        className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
                        disabled={quantity <= 1}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <input
                        id="quantity"
                        type="number"
                        min={1}
                        max={product.stock}
                        value={quantity}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(product.stock, Number(e.target.value)));
                          setQuantity(val);
                        }}
                        aria-label="Quantity"
                        className="w-14 text-center py-2 text-sm font-medium text-gray-900 border-x border-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                        aria-label="Increase quantity"
                        className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
                        disabled={quantity >= product.stock}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Add to cart button */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-indigo-500 active:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition-colors disabled:opacity-60"
                  >
                    {addingToCart ? 'Adding...' : 'Add to Cart'}
                  </button>

                  {/* Cart message toast */}
                  {cartMessage && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700 text-center"
                    >
                      {cartMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
