import storeConfig from '../config/store';

/**
 * Formats a number as the store's configured currency.
 * Currency symbol/code is controlled by storeConfig.currency.
 *
 * Usage: formatPrice(99.9) → "AED 99.90"  (or "USD 99.90", "EUR 99.90", etc.)
 */
export function formatPrice(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return `${storeConfig.currency} 0.00`;
  return `${storeConfig.currency} ${num.toFixed(2)}`;
}
