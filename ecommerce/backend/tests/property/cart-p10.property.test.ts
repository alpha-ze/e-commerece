/**
 * Property-based test: P10
 * P10 — Out-of-stock products cannot be added to cart
 * Validates: Requirement 7.2
 */

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('../../src/models/cart', () => ({
  getCartItems: jest.fn().mockResolvedValue([]),
  addToCart: jest.fn(),
  updateCartItem: jest.fn(),
  removeCartItem: jest.fn(),
}));

import * as fc from 'fast-check';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';

const SECRET = process.env.JWT_SECRET!;

function customerToken(id = 1) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ id, email: 'user@test.com', role: 'customer' }, SECRET, { expiresIn: '1h' } as any);
}

function getDbMock() {
  return require('../../src/db').default;
}

// Feature: ecommerce-web-app, Property 10: Out-of-stock products cannot be added to cart
describe('P10: Out-of-stock products cannot be added to cart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getCartItems } = require('../../src/models/cart');
    (getCartItems as jest.Mock).mockResolvedValue([]);
  });

  it('adding an out-of-stock product always returns 400', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: 1, max: 50 }),
        async (productId, quantity) => {
          // Product exists but stock = 0
          getDbMock().query.mockResolvedValue({ rows: [{ stock: 0 }] });

          const token = customerToken();
          const res = await request(app)
            .post('/api/cart')
            .set('Authorization', `Bearer ${token}`)
            .send({ product_id: productId, quantity });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          expect(res.body.error.message).toMatch(/out of stock/i);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('product with stock > 0 does not get a 400 out-of-stock error', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: 1, max: 100 }),
        async (productId, stock) => {
          getDbMock().query.mockResolvedValue({ rows: [{ stock }] });

          const { getCartItems, addToCart } = require('../../src/models/cart');
          (getCartItems as jest.Mock).mockResolvedValue([]);
          (addToCart as jest.Mock).mockResolvedValue(undefined);

          const token = customerToken();
          const res = await request(app)
            .post('/api/cart')
            .set('Authorization', `Bearer ${token}`)
            .send({ product_id: productId, quantity: 1 });

          if (res.status === 400) {
            expect(res.body.error?.message).not.toMatch(/out of stock/i);
          }
        },
      ),
      { numRuns: 30 },
    );
  });

  it('missing product returns 400 (not an out-of-stock)', async () => {
    getDbMock().query.mockResolvedValue({ rows: [] }); // product not found

    const token = customerToken();
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: 99999, quantity: 1 });

    expect([400, 404]).toContain(res.status);
    expect(res.body.error?.message).not.toMatch(/out of stock/i);
  });
});
