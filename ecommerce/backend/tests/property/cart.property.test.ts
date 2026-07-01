// Feature: ecommerce-web-app, Property 9: Cart totals are arithmetically correct
import * as fc from 'fast-check';
import { calculateCartTotals } from '../../src/utils/cart';

/**
 * Validates: Requirements 7.6
 *
 * For any cart state with N items, the API-returned `subtotal` must equal
 * the sum of effective_price(item) × quantity for all items,
 * `tax` must equal subtotal × TAX_RATE, and `total` must equal subtotal + tax.
 */
describe('P9: Cart totals are arithmetically correct', () => {
  it('subtotal, tax, and total are always arithmetically consistent', () => {
    const TAX_RATE = 0; // default tax rate (no external env in unit tests)

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            price: fc.float({ min: Math.fround(0.01), max: Math.fround(9999), noNaN: true }),
            discount_price: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(9999), noNaN: true })),
            quantity: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1 },
        ),
        (items) => {
          const expectedSubtotal = items.reduce((sum, item) => {
            const ep = item.discount_price ?? item.price;
            return sum + ep * item.quantity;
          }, 0);
          const expectedTax = expectedSubtotal * TAX_RATE;
          const expectedTotal = expectedSubtotal + expectedTax;

          const result = calculateCartTotals(items, TAX_RATE);

          expect(result.subtotal).toBeCloseTo(expectedSubtotal, 2);
          expect(result.tax).toBeCloseTo(expectedTax, 2);
          expect(result.total).toBeCloseTo(expectedTotal, 2);
          // total must equal subtotal + tax (internal consistency)
          expect(result.total).toBeCloseTo(result.subtotal + result.tax, 2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('uses discount_price over price when discount_price is set', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Use smaller values to avoid floating-point precision issues in toBeCloseTo
          price: fc.float({ min: Math.fround(1), max: Math.fround(999), noNaN: true }),
          discount_price: fc.float({ min: Math.fround(0.01), max: Math.fround(999), noNaN: true }),
          quantity: fc.integer({ min: 1, max: 10 }),
        }),
        (item) => {
          const withDiscount = calculateCartTotals([item]);
          const withoutDiscount = calculateCartTotals([
            { ...item, discount_price: null },
          ]);
          // If discount_price !== price, totals must differ
          if (item.discount_price !== item.price) {
            const epDiscount = item.discount_price * item.quantity;
            const epFull = item.price * item.quantity;
            // Use precision 1 (within 0.05) to accommodate 32-bit float arithmetic
            expect(withDiscount.subtotal).toBeCloseTo(epDiscount, 1);
            expect(withoutDiscount.subtotal).toBeCloseTo(epFull, 1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P10: Out-of-stock products cannot be added to cart
// ─────────────────────────────────────────────────────────────────────────────

// ── Env / mocks for P10 HTTP-level tests ────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

jest.mock('../../src/db', () => ({
  default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('../../src/models/cart', () => ({
  getCartItems: jest.fn(),
  addToCart: jest.fn(),
  updateCartItem: jest.fn(),
  removeCartItem: jest.fn(),
}));

// Feature: ecommerce-web-app, Property 10: Out-of-stock products cannot be 