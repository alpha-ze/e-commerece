/**
 * Property-based tests: P13, P14
 *
 * P13 — Checkout side effects are atomic
 * P14 — Invalid coupon codes are rejected at checkout
 */

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    }),
  },
}));

jest.mock('../../src/models/order', () => ({
  getCartItemsForCheckout: jest.fn(),
  validateUserAddress: jest.fn(),
  getCouponByCode: jest.fn(),
  createOrder: jest.fn(),
  createOrderItem: jest.fn(),
  decrementProductStock: jest.fn(),
  clearCart: jest.fn(),
  getOrdersByUser: jest.fn(),
  getOrderById: jest.fn(),
  getOrderItems: jest.fn(),
  getAddressById: jest.fn(),
}));

import * as fc from 'fast-check';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import {
  getCartItemsForCheckout,
  validateUserAddress,
  getCouponByCode,
  createOrder,
  createOrderItem,
  decrementProductStock,
  clearCart,
} from '../../src/models/order';
import type { CartItemForCheckout } from '../../src/models/order';

const mockGetCartItemsForCheckout = getCartItemsForCheckout as jest.Mock;
const mockValidateUserAddress = validateUserAddress as jest.Mock;
const mockGetCouponByCode = getCouponByCode as jest.Mock;
const mockCreateOrder = createOrder as jest.Mock;
const mockCreateOrderItem = createOrderItem as jest.Mock;
const mockDecrementProductStock = decrementProductStock as jest.Mock;
const mockClearCart = clearCart as jest.Mock;

const SECRET = process.env.JWT_SECRET!;

function customerToken(id = 1) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ id, email: 'user@test.com', role: 'customer' }, SECRET, { expiresIn: '1h' } as any);
}

function makeCartItem(productId: number, price: string, quantity: number): CartItemForCheckout {
  return {
    product_id: productId,
    product_name: `Product ${productId}`,
    price,
    discount_price: null,
    stock: 10,
    quantity,
  };
}

function makeOrderRow(id: number, userId: number) {
  return {
    id,
    user_id: userId,
    address_id: 1,
    status: 'Confirmed',
    payment_method: 'Cash on Delivery',
    subtotal: '100.00',
    tax: '0.00',
    discount: '0.00',
    total: '100.00',
    coupon_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

function refreshDbClient() {
  const db = require('../../src/db').default;
  db.connect.mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// P13: Checkout side effects are atomic
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 13: Checkout side effects are atomic
describe('P13: Checkout side effects are atomic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshDbClient();
    mockValidateUserAddress.mockResolvedValue(true);
    mockGetCouponByCode.mockResolvedValue(null);
    mockClearCart.mockResolvedValue(undefined);
    mockDecrementProductStock.mockResolvedValue(undefined);
  });

  it('successful checkout creates order, decrements stock, and clears cart atomically', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            productId: fc.integer({ min: 1, max: 100 }),
            price: fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }),
            quantity: fc.integer({ min: 1, max: 5 }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        fc.integer({ min: 1, max: 9999 }),
        async (items, userId) => {
          refreshDbClient();
          jest.clearAllMocks();
          mockValidateUserAddress.mockResolvedValue(true);
          mockGetCouponByCode.mockResolvedValue(null);
          mockClearCart.mockResolvedValue(undefined);
          mockDecrementProductStock.mockResolvedValue(undefined);

          const uniqueItems = items.reduce<typeof items>((acc, item) => {
            if (!acc.find((i) => i.productId === item.productId)) acc.push(item);
            return acc;
          }, []);

          const cartItems = uniqueItems.map((i) =>
            makeCartItem(i.productId, i.price.toFixed(2), i.quantity),
          );

          mockGetCartItemsForCheckout.mockResolvedValue(cartItems);

          const orderRow = makeOrderRow(42, userId);
          mockCreateOrder.mockResolvedValue(orderRow);
          mockCreateOrderItem.mockImplementation((_client, params) => ({
            id: params.productId,
            order_id: 42,
            product_id: params.productId,
            quantity: params.quantity,
            unit_price: String(params.unitPrice),
            subtotal: String(params.subtotal),
          }));

          const token = customerToken(userId);
          const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({ address_id: 1, payment_method: 'Cash on Delivery' });

          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);

          // a. Order was created
          expect(mockCreateOrder).toHaveBeenCalledTimes(1);

          // b. Stock decremented for each product
          expect(mockDecrementProductStock).toHaveBeenCalledTimes(uniqueItems.length);
          for (const item of uniqueItems) {
            expect(mockDecrementProductStock).toHaveBeenCalledWith(
              expect.anything(),
              item.productId,
              item.quantity,
            );
          }

          // c. Cart was cleared
          expect(mockClearCart).toHaveBeenCalledTimes(1);
          expect(mockClearCart).toHaveBeenCalledWith(expect.anything(), userId);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('empty cart checkout always returns 400', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9999 }),
        async (userId) => {
          mockGetCartItemsForCheckout.mockResolvedValue([]);

          const token = customerToken(userId);
          const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({ address_id: 1, payment_method: 'Cash on Delivery' });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          expect(mockCreateOrder).not.toHaveBeenCalled();
          expect(mockClearCart).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P14: Invalid coupon codes are rejected at checkout
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 14: Invalid coupon codes are rejected at checkout
describe('P14: Invalid coupon codes are rejected at checkout', () => {
  const baseCartItem = makeCartItem(1, '50.00', 2);

  beforeEach(() => {
    jest.clearAllMocks();
    refreshDbClient();
    mockGetCartItemsForCheckout.mockResolvedValue([baseCartItem]);
    mockValidateUserAddress.mockResolvedValue(true);
  });

  it('non-existent coupon code always returns 400', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        async (couponCode) => {
          mockGetCouponByCode.mockResolvedValue(null);

          const token = customerToken();
          const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({ address_id: 1, coupon_code: couponCode });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('expired coupon always returns 400', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        async (couponCode) => {
          mockGetCouponByCode.mockResolvedValue({
            id: 1,
            code: couponCode,
            discount_type: 'percentage',
            discount_value: '10',
            expires_at: new Date(Date.now() - 1000),
            is_active: true,
          });

          const token = customerToken();
          const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({ address_id: 1, coupon_code: couponCode });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('inactive coupon always returns 400', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        async (couponCode) => {
          mockGetCouponByCode.mockResolvedValue({
            id: 2,
            code: couponCode,
            discount_type: 'fixed',
            discount_value: '5',
            expires_at: new Date(Date.now() + 86400000),
            is_active: false,
          });

          const token = customerToken();
          const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({ address_id: 1, coupon_code: couponCode });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 30 },
    );
  });
});
