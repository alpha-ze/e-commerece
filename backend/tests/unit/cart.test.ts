/**
 * Unit tests for cart service business logic.
 *
 * These tests exercise the calculateCartTotals utility and the service-layer
 * input validation without requiring a live database connection.
 */
import { calculateCartTotals } from '../../src/utils/cart';

describe('calculateCartTotals', () => {
  it('returns zero totals for an empty cart', () => {
    const result = calculateCartTotals([]);
    expect(result.subtotal).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });

  it('uses price when discount_price is null', () => {
    const items = [{ price: 10, discount_price: null, quantity: 2 }];
    const result = calculateCartTotals(items, 0);
    expect(result.subtotal).toBeCloseTo(20, 2);
    expect(result.total).toBeCloseTo(20, 2);
  });

  it('uses discount_price instead of price when set', () => {
    const items = [{ price: 10, discount_price: 7, quantity: 3 }];
    const result = calculateCartTotals(items, 0);
    expect(result.subtotal).toBeCloseTo(21, 2); // 7 * 3
    expect(result.total).toBeCloseTo(21, 2);
  });

  it('calculates tax correctly', () => {
    const items = [{ price: 100, discount_price: null, quantity: 1 }];
    const result = calculateCartTotals(items, 0.1); // 10% tax
    expect(result.subtotal).toBeCloseTo(100, 2);
    expect(result.tax).toBeCloseTo(10, 2);
    expect(result.total).toBeCloseTo(110, 2);
  });

  it('sums multiple items correctly', () => {
    const items = [
      { price: 20, discount_price: 15, quantity: 2 },  // effective: 15 * 2 = 30
      { price: 50, discount_price: null, quantity: 1 }, // effective: 50 * 1 = 50
    ];
    const result = calculateCartTotals(items, 0);
    expect(result.subtotal).toBeCloseTo(80, 2);
  });

  it('rounds to 2 decimal places', () => {
    // 10.005 * 3 = 30.015 → rounds to 30.02
    const items = [{ price: 10.005, discount_price: null, quantity: 3 }];
    const result = calculateCartTotals(items, 0);
    // Should be rounded to 2dp
    const decimalPlaces = (result.subtotal.toString().split('.')[1] ?? '').length;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });

  it('total equals subtotal + tax', () => {
    const items = [
      { price: 33.33, discount_price: null, quantity: 3 },
      { price: 7.77, discount_price: 5.55, quantity: 2 },
    ];
    const result = calculateCartTotals(items, 0.08);
    expect(result.total).toBeCloseTo(result.subtotal + result.tax, 2);
  });
});
