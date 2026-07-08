import { Link } from 'react-router-dom';
import type { Product } from '../api/products';

interface ProductCardProps {
  product: Product;
}

function StarRating({ rating }: { rating: string | null }) {
  const value = rating ? parseFloat(rating) : 0;
  const fullStars = Math.floor(value);
  const hasHalf = value - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < fullStars) {
          return (
            <svg key={i} className="w-3.5 h-3.5 text-[#F5A623]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          );
        }
        if (i === fullStars && hasHalf) {
          return (
            <span key={i} className="relative w-3.5 h-3.5">
              <svg className="w-3.5 h-3.5 text-gray-200 absolute" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <svg className="w-3.5 h-3.5 text-[#F5A623] absolute overflow-hidden" style={{ clipPath: 'inset(0 50% 0 0)' }} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </span>
          );
        }
        return (
          <svg key={i} className="w-3.5 h-3.5 text-gray-200" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      })}
      {rating && value > 0 && (
        <span className="text-xs text-gray-400 ml-1">({parseFloat(rating).toFixed(1)})</span>
      )}
    </div>
  );
}

export default function ProductCard({ product }: ProductCardProps) {
  const effectivePrice = product.discount_price
    ? parseFloat(product.discount_price)
    : parseFloat(product.price);
  const originalPrice = parseFloat(product.price);
  const hasDiscount = product.discount_price !== null && parseFloat(product.discount_price!) < originalPrice;
  const discountPct = hasDiscount
    ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
    : 0;

  const isOutOfStock = product.stock === 0;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex flex-col bg-white rounded-lg border border-gray-200 hover:border-[#E31E24] hover:shadow-lg transition-all duration-200 overflow-hidden"
      aria-label={product.name}
    >
      {/* Image area */}
      <div className="relative bg-white p-4 aspect-square overflow-hidden">
        {product.primary_image_url ? (
          <img
            src={product.primary_image_url}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded">
            <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasDiscount && (
            <span className="bg-[#E31E24] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              -{discountPct}%
            </span>
          )}
          {product.is_featured && (
            <span className="bg-[#1a1a1a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              HOT
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-gray-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              OUT OF STOCK
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-3 pb-4 pt-2 gap-1.5 border-t border-gray-100">
        {/* Category */}
        {product.category_name && (
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {product.category_name}
          </span>
        )}

        {/* Name */}
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Stars */}
        <StarRating rating={product.avg_rating} />

        {/* Price block */}
        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[#E31E24]">
              AED {effectivePrice.toFixed(2)}
            </span>
          </div>
          {hasDiscount && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 line-through">
                AED {originalPrice.toFixed(2)}
              </span>
              <span className="text-xs text-green-600 font-semibold">
                Save AED {(originalPrice - effectivePrice).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Add to cart button — shown on hover */}
        <button
          onClick={(e) => { e.preventDefault(); window.location.href = `/products/${product.id}`; }}
          disabled={isOutOfStock}
          className={`mt-2 w-full py-2 text-xs font-semibold rounded transition-all ${
            isOutOfStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-[#E31E24] text-white hover:bg-[#c41820] active:scale-95'
          }`}
        >
          {isOutOfStock ? 'Out of Stock' : 'View Product'}
        </button>
      </div>
    </Link>
  );
}
