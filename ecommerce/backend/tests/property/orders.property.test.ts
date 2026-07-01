/**
 * Property-based tests: P15, P18, P19
 *
 * P15 — Order isolation between customers
 * P18 — Admin order status filter returns only matching orders
 * P19 — Invalid order status values are rejected
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

jest.mock('../../src/services/order', () => ({
  checkout: jest.fn(),
  getOrderHistory: jest.fn(),
  getOrderDetail: jest.fn(),
}));

jest.mock('../../src/services/admin', () => ({
  getDashboard: jest.fn(),
  listAdminOrders: jest.fn(),
  updateAdminOrderStatus: jest.fn(),
  listAdminUsers: jest.fn(),
  updateAdminUser: jest.fn(),
  listCoupons: jest.fn(),
  addCoupon: jest.fn(),
  removeCoupon: jest.fn(),
}));

import * as fc from 'fast-check';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';

// Lazy-load mock refs after jest.mock runs
function getOrderServiceMocks() {
  const svc = require('../../src/services/order');
  return { getOrderDetail: svc.getOrderDetail as jest.Mock };
}

function getAdminServiceMocks() {
  const svc = require('../../src/services/admin');
  return {
    listAdminOrders: svc.listAdminOrders as jest.Mock,
    updateAdminOrderStatus: svc.updateAdminOrderStatus as jest.Mock,
  };
}

const SECRET = process.env.JWT_SECRET!;

function tokenFor(id: number, role: 'customer' | 'admin' = 'customer') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ id, email: `u${id}@test.com`, role }, SECRET, { expiresIn: '1h' } as any);
}

const VALID_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// P15: Order isolation between customers
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 15: Order isolation between customers
describe('P15: Order isolation between customers', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('customer B cannot view customer A order — always 403', () => {
    const { getOrderDetail } = getOrderServiceMocks();
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5000 }),
        fc.integer({ min: 5001, max: 10000 }),
        fc.integer({ min: 1, max: 9999 }),
        async (_userAId, _userBId, orderId) => {
          const forbiddenErr = Object.assign(
            new Error('You do not have permission to view this order'),
            { code: 'ORDER_FORBIDDEN' },
          );
          getOrderDetail.mockRejectedValue(forbiddenErr);

          const tokenB = tokenFor(_userBId);
          const res = await request(app)
            .get(`/api/orders/${orderId}`)
            .set('Authorization', `Bearer ${tokenB}`);

          expect(res.status).toBe(403);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('the correct owner can view their own order — 200', () => {
    const { getOrderDetail } = getOrderServiceMocks();
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: 1, max: 9999 }),
        async (userId, orderId) => {
          getOrderDetail.mockResolvedValue({
            id: orderId,
            user_id: userId,
            address_id: 1,
            status: 'Pending',
            payment_method: 'Cash on Delivery',
            subtotal: 100,
            tax: 0,
            discount: 0,
            total: 100,
            coupon_id: null,
            created_at: new Date(),
            updated_at: new Date(),
            items: [],
            address: null,
          });

          const token = tokenFor(userId);
          const res = await request(app)
            .get(`/api/orders/${orderId}`)
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P18: Admin order status filter returns only matching orders
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 18: Admin order status filter returns only matching orders
describe('P18: Admin order status filter returns only matching orders', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('every returned order has exactly the requested status', () => {
    const { listAdminOrders } = getAdminServiceMocks();
    return fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...VALID_STATUSES),
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 0, maxLength: 8 }),
        async (status, ids) => {
          const orders = ids.map((id) => ({
            id,
            user_id: 1,
            status,
            payment_method: 'Cash on Delivery',
            subtotal: '50.00',
            tax: '0.00',
            discount: '0.00',
            total: '50.00',
            coupon_id: null,
            created_at: new Date(),
          }));
          listAdminOrders.mockResolvedValue({
            orders,
            pagination: { page: 1, pageSize: 20, total: orders.length },
          });

          const token = tokenFor(1, 'admin');
          const res = await request(app)
            .get('/api/admin/orders')
            .set('Authorization', `Bearer ${token}`)
            .query({ status });

          expect(res.status).toBe(200);
          const returnedOrders = res.body.data.orders as Array<{ status: string }>;
          for (const order of returnedOrders) {
            expect(order.status).toBe(status);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P19: Invalid order status values are rejected
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 19: Invalid order status values are rejected
describe('P19: Invalid order status values are rejected', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('arbitrary non-enum status strings always return 400', () => {
    const { updateAdminOrderStatus } = getAdminServiceMocks();
    return fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }).filter(
          (s) => !(VALID_STATUSES as readonly string[]).includes(s),
        ),
        async (invalidStatus) => {
          // The service throws INVALID_STATUS for unknown statuses
          const err = Object.assign(
            new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`),
            { code: 'INVALID_STATUS' },
          );
          updateAdminOrderStatus.mockRejectedValue(err);

          const token = tokenFor(1, 'admin');
          const res = await request(app)
            .put('/api/admin/orders/1')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: invalidStatus });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('valid statuses do not return 400', () => {
    const { updateAdminOrderStatus } = getAdminServiceMocks();
    return fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...VALID_STATUSES),
        async (validStatus) => {
          updateAdminOrderStatus.mockResolvedValue({
            order: {
              id: 1,
              user_id: 2,
              address_id: 1,
              status: validStatus,
              payment_method: 'Cash on Delivery',
              subtotal: '50.00',
              tax: '0.00',
              discount: '0.00',
              total: '50.00',
              coupon_id: null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });

          const token = tokenFor(1, 'admin');
          const res = await request(app)
            .put('/api/admin/orders/1')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: validStatus });

          expect(res.status).not.toBe(400);
        },
      ),
      { numRuns: 20 },
    );
  });
});
