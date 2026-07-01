/**
 * P10 — Out-of-stock products cannot be added to cart
 * Validates: Requirement 7.2
 *
 * NOTE: The full property-based test for P10 lives in cart-p10.property.test.ts.
 * This file exists as a named entry-point for the out-of-stock scenario and
 * re-exports the same behavioural guarantee via an integration-style check.
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
describe('P10 (out-of-stock integration): out-of-stock item returns 400', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getCartItems } = require('../../src/models/cart');
    (getCartItems as jest.Mock).mockResolvedValue([]);
  });

  it('returns 400 with out-of-stock message when stock is 0', async () => {
    // Mock DB to return stock = 0 for any product lookup
    getDbMock().query.mockResolvedValue({ rows: [{ stock: 0 }] });

    const token = customerToken();
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: 1, quantity: 1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/out of stock/i);
  });

  it('returns 400 when product is not found', async () => {
    // Mock DB to return no rows (product doesn't exist)
    getDbMock().query.mockResolvedValue({ rows: [] });

    const token = customerToken();
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: 99999, quantity: 1 });

    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});
