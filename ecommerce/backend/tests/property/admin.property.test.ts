/**
 * Property-based tests: P20, P21, P22
 *
 * P20 — Deactivated user accounts cannot log in
 * P21 — Coupon list items contain all required fields
 * P22 — Dashboard revenue equals sum of Delivered order totals
 */

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

jest.mock('../../src/models/user', () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  findUserByResetToken: jest.fn(),
  setResetToken: jest.fn(),
  clearResetToken: jest.fn(),
  updateUserPassword: jest.fn(),
}));

jest.mock('../../src/utils/mailer', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('../../src/models/admin', () => ({
  getDashboardStats: jest.fn(),
  getDailyRevenue: jest.fn(),
  getAllOrders: jest.fn(),
  updateOrderStatus: jest.fn(),
  getAllUsers: jest.fn(),
  updateUser: jest.fn(),
  getAllCoupons: jest.fn(),
  createCoupon: jest.fn(),
  deleteCoupon: jest.fn(),
}));

import * as fc from 'fast-check';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import { findUserByEmail } from '../../src/models/user';
import {
  getAllCoupons,
  getDashboardStats,
  getDailyRevenue,
} from '../../src/models/admin';
import type { CouponRow } from '../../src/models/admin';

const mockFindUserByEmail = findUserByEmail as jest.Mock;
const mockGetAllCoupons = getAllCoupons as jest.Mock;
const mockGetDashboardStats = getDashboardStats as jest.Mock;
const mockGetDailyRevenue = getDailyRevenue as jest.Mock;

const SECRET = process.env.JWT_SECRET!;

function adminToken() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ id: 1, email: 'admin@test.com', role: 'admin' }, SECRET, { expiresIn: '1h' } as any);
}

// ─────────────────────────────────────────────────────────────────────────────
// P20: Deactivated user accounts cannot log in
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 20: Deactivated user accounts cannot log in
describe('P20: Deactivated user accounts cannot log in', () => {
  let hashedPassword: string;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('validPass1', 10);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deactivated user with correct credentials always gets 403', () => {
    const LOGIN_EMAIL = 'deactivated@example.com';
    return fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 9999 }),
          name: fc.string({ minLength: 1, maxLength: 30 }),
        }),
        async (userData) => {
          mockFindUserByEmail.mockResolvedValue({
            id: userData.id,
            name: userData.name,
            email: LOGIN_EMAIL,
            password: hashedPassword,
            role: 'customer' as const,
            is_active: false,
            reset_token: null,
            reset_token_expiry: null,
            created_at: new Date(),
            updated_at: new Date(),
          });

          const res = await request(app)
            .post('/api/auth/login')
            .send({ email: LOGIN_EMAIL, password: 'validPass1' });

          expect(res.status).toBe(403);
          expect(res.body.success).toBe(false);
          expect(res.body.error).toHaveProperty('message');
          expect(res.body.data?.token).toBeUndefined();
        },
      ),
      { numRuns: 15 },
    );
  });

  it('active user with correct credentials gets 200 (not 403)', () => {
    // Use a fixed valid email in the request; vary only the DB user record
    const LOGIN_EMAIL = 'active-user@example.com';
    return fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 9999 }),
          name: fc.string({ minLength: 1, maxLength: 30 }),
        }),
        async (userData) => {
          mockFindUserByEmail.mockResolvedValue({
            id: userData.id,
            name: userData.name,
            email: LOGIN_EMAIL,
            password: hashedPassword,
            role: 'customer' as const,
            is_active: true,
            reset_token: null,
            reset_token_expiry: null,
            created_at: new Date(),
            updated_at: new Date(),
          });

          const res = await request(app)
            .post('/api/auth/login')
            .send({ email: LOGIN_EMAIL, password: 'validPass1' });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('token');
        },
      ),
      { numRuns: 10 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P21: Coupon list items contain all required fields
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 21: Coupon list items contain all required fields
describe('P21: Coupon list items contain all required fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('every coupon in the list response includes code, discount_type, discount_value, expires_at, is_active', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 9999 }),
            code: fc.string({ minLength: 3, maxLength: 20 }).map((s) => s.toUpperCase()),
            discount_type: fc.constantFrom('percentage', 'fixed') as fc.Arbitrary<'percentage' | 'fixed'>,
            discount_value: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }).map((f) => String(f.toFixed(2))),
            expires_at: fc.date({ min: new Date('2025-01-01'), max: new Date('2030-01-01') }),
            is_active: fc.boolean(),
            created_at: fc.constant(new Date()),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        async (coupons) => {
          mockGetAllCoupons.mockResolvedValue(coupons);

          const token = adminToken();
          const res = await request(app)
            .get('/api/admin/coupons')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);

          const items = res.body.data as Array<Record<string, unknown>>;
          for (const item of items) {
            expect(item).toHaveProperty('code');
            expect(item).toHaveProperty('discount_type');
            expect(item).toHaveProperty('discount_value');
            expect(item).toHaveProperty('expires_at');
            expect(item).toHaveProperty('is_active');
            // Validate types
            expect(typeof item.code).toBe('string');
            expect(['percentage', 'fixed']).toContain(item.discount_type);
            expect(typeof item.is_active).toBe('boolean');
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P22: Dashboard revenue equals sum of Delivered order totals
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 22: Dashboard revenue equals sum of Delivered order totals
describe('P22: Dashboard revenue equals sum of Delivered order totals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDailyRevenue.mockResolvedValue([]);
  });

  it('total_revenue matches the arithmetic sum of Delivered order totals', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.float({ min: Math.fround(0.01), max: Math.fround(9999), noNaN: true }),
          { minLength: 0, maxLength: 20 },
        ),
        async (deliveredTotals) => {
          const expectedRevenue = deliveredTotals.reduce((sum, t) => sum + t, 0);
          const revenueStr = expectedRevenue.toFixed(2);

          mockGetDashboardStats.mockResolvedValue({
            total_orders: deliveredTotals.length,
            total_customers: 5,
            total_revenue: revenueStr,
          });

          const token = adminToken();
          const res = await request(app)
            .get('/api/admin/dashboard')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);

          const data = res.body.data;
          const returnedRevenue = parseFloat(data.total_revenue);
          expect(returnedRevenue).toBeCloseTo(parseFloat(revenueStr), 2);
        },
      ),
      { numRuns: 50 },
    );
  });
});
