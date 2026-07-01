/**
 * Property-based tests: P11, P12
 *
 * P11 — Wishlist add/remove round-trip
 * P12 — Wishlist items contain all required fields
 */

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('../../src/models/wishlist', () => ({
  getWishlistItems: jest.fn(),
  addToWishlist: jest.fn(),
  removeFromWishlist: jest.fn(),
}));

import * as fc from 'fast-check';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import {
  getWishlistItems,
  addToWishlist,
  removeFromWishlist,
} from '../../src/models/wishlist';
import type { WishlistItemRow } from '../../src/models/wishlist';

const mockGetWishlistItems = getWishlistItems as jest.Mock;
const mockAddToWishlist = addToWishlist as jest.Mock;
const mockRemoveFromWishlist = removeFromWishlist as jest.Mock;

const SECRET = process.env.JWT_SECRET!;

function customerToken(id = 1) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ id, email: 'user@test.com', role: 'customer' }, SECRET, { expiresIn: '1h' } as any);
}

function makeWishlistRow(productId: number, userId = 1): WishlistItemRow {
  return {
    id: productId,
    user_id: userId,
    product_id: productId,
    product_name: `Product ${productId}`,
    price: '29.99',
    discount_price: null,
    primary_image: 'https://example.com/img.jpg',
    added_at: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// P11: Wishlist add/remove round-trip
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 11: Wishlist add/remove round-trip
describe('P11: Wishlist add/remove round-trip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Product exists check for the wishlist service
    const db = require('../../src/db').default;
    db.query.mockResolvedValue({ rows: [{ id: 1 }] });
  });

  it('adding then removing a product returns the wishlist to its original state', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9999 }),
        fc.array(fc.integer({ min: 100, max: 200 }), { minLength: 0, maxLength: 5 }),
        async (newProductId, existingProductIds) => {
          const db = require('../../src/db').default;
          db.query.mockResolvedValue({ rows: [{ id: newProductId }] });

          const uniqueExisting = [...new Set(existingProductIds)].filter(
            (id) => id !== newProductId,
          );
          const initialRows = uniqueExisting.map((id) => makeWishlistRow(id));

          // GET initial → add → GET after add → remove → GET after remove
          mockGetWishlistItems
            .mockResolvedValueOnce(initialRows)                                    // initial GET
            .mockResolvedValueOnce([...initialRows, makeWishlistRow(newProductId)]) // after add
            .mockResolvedValueOnce(initialRows);                                   // after remove

          mockAddToWishlist.mockResolvedValue(makeWishlistRow(newProductId));
          mockRemoveFromWishlist.mockResolvedValue(true);

          const token = customerToken();

          // Capture initial state
          const initialRes = await request(app)
            .get('/api/wishlist')
            .set('Authorization', `Bearer ${token}`);

          // Add product
          await request(app)
            .post('/api/wishlist')
            .set('Authorization', `Bearer ${token}`)
            .send({ product_id: newProductId });

          // Remove product
          const afterRemoveRes = await request(app)
            .delete(`/api/wishlist/${newProductId}`)
            .set('Authorization', `Bearer ${token}`);

          expect(afterRemoveRes.status).toBe(200);

          const afterRemoveItems = afterRemoveRes.body.data as Array<{ product_id: number }>;
          const stillPresent = afterRemoveItems.some((i) => i.product_id === newProductId);
          expect(stillPresent).toBe(false);
          expect(afterRemoveItems.length).toBe(initialRes.body.data?.length ?? 0);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('adding a product already in the wishlist returns 409', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9999 }),
        async (productId) => {
          const db = require('../../src/db').default;
          db.query.mockResolvedValue({ rows: [{ id: productId }] });
          // addToWishlist returns null → duplicate
          mockAddToWishlist.mockResolvedValue(null);

          const token = customerToken();
          const res = await request(app)
            .post('/api/wishlist')
            .set('Authorization', `Bearer ${token}`)
            .send({ product_id: productId });

          expect(res.status).toBe(409);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P12: Wishlist items contain all required fields
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 12: Wishlist items contain all required fields
describe('P12: Wishlist items contain all required fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('every wishlist item includes product_name, primary_image, price, and discount_price', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 9999 }),
            user_id: fc.constant(1),
            product_id: fc.integer({ min: 1, max: 9999 }),
            product_name: fc.string({ minLength: 1, maxLength: 50 }),
            price: fc.float({ min: Math.fround(0.01), max: Math.fround(9999), noNaN: true })
              .map((f) => f.toFixed(2)),
            discount_price: fc.option(
              fc.float({ min: Math.fround(0.01), max: Math.fround(9999), noNaN: true })
                .map((f) => f.toFixed(2)),
            ),
            primary_image: fc.option(fc.webUrl()),
            added_at: fc.constant(new Date()),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        async (rows) => {
          mockGetWishlistItems.mockResolvedValue(rows);

          const token = customerToken();
          const res = await request(app)
            .get('/api/wishlist')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);

          const items = res.body.data as Array<Record<string, unknown>>;
          for (const item of items) {
            // Required fields per spec requirement 8.4
            expect(item).toHaveProperty('product_name');
            expect(item).toHaveProperty('primary_image');
            expect(item).toHaveProperty('price');
            expect(item).toHaveProperty('discount_price');
            // price must be a parseable string
            expect(typeof item.price).toBe('string');
            expect(isFinite(parseFloat(item.price as string))).toBe(true);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
