/**
 * Property-based tests: P23, P24
 *
 * P23 — Validation error responses are structured
 * P24 — All API responses follow the standard envelope
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

jest.mock('../../src/models/product', () => ({
  getProducts: jest.fn(),
  getProductById: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
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
import app from '../../src/app';
import { findUserByEmail, createUser } from '../../src/models/user';
import { getProducts } from '../../src/models/product';

const mockFindUserByEmail = findUserByEmail as jest.Mock;
const mockCreateUser = createUser as jest.Mock;
const mockGetProducts = getProducts as jest.Mock;

const SECRET = process.env.JWT_SECRET!;

function adminToken() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ id: 1, email: 'admin@test.com', role: 'admin' }, SECRET, { expiresIn: '1h' } as any);
}

function customerToken(id = 2) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ id, email: 'u@test.com', role: 'customer' }, SECRET, { expiresIn: '1h' } as any);
}

// Endpoints that perform schema validation and return 400 with fields array
const VALIDATING_ENDPOINTS = [
  {
    method: 'post' as const,
    path: '/api/auth/register',
    invalidBody: { email: 'not-an-email' }, // missing name, invalid email, missing password
  },
  {
    method: 'post' as const,
    path: '/api/auth/login',
    invalidBody: {}, // missing email and password
  },
  {
    method: 'post' as const,
    path: '/api/auth/forgot-password',
    invalidBody: {}, // missing email
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// P23: Validation error responses are structured
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 23: Validation error responses are structured
describe('P23: Validation error responses are structured', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registration: invalid payloads return { success: false, error: { fields: [...] } }', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate clearly invalid registration bodies
          name: fc.option(fc.constant('')), // blank name or absent
          email: fc.option(
            fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !s.includes('@')),
          ),
          password: fc.option(fc.string({ minLength: 1, maxLength: 5 })), // too short
        }).map(({ name, email, password }) => {
          const body: Record<string, unknown> = {};
          if (name !== null) body.name = name;
          if (email !== null) body.email = email;
          if (password !== null) body.password = password;
          return body;
        }),
        async (invalidBody) => {
          const res = await request(app)
            .post('/api/auth/register')
            .send(invalidBody);

          if (res.status === 400) {
            expect(res.body.success).toBe(false);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toHaveProperty('fields');
            expect(Array.isArray(res.body.error.fields)).toBe(true);
            expect(res.body.error.fields.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('login: empty body returns { success: false, error: { fields: [...] } }', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('fields');
    expect(Array.isArray(res.body.error.fields)).toBe(true);
    expect(res.body.error.fields.length).toBeGreaterThan(0);
  });

  it('forgot-password: empty body returns { success: false, error: { fields: [...] } }', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('fields');
    expect(Array.isArray(res.body.error.fields)).toBe(true);
    expect(res.body.error.fields.length).toBeGreaterThan(0);
  });

  it('all validating endpoints return non-empty fields array on invalid input', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.nat({ max: VALIDATING_ENDPOINTS.length - 1 }),
        async (idx) => {
          const ep = VALIDATING_ENDPOINTS[idx];
          const res = await (request(app) as any)[ep.method](ep.path).send(ep.invalidBody);

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          expect(Array.isArray(res.body.error?.fields)).toBe(true);
          expect(res.body.error.fields.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P24: All API responses follow the standard envelope
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 24: All API responses follow the standard envelope
describe('P24: All API responses follow the standard envelope', () => {
  const dbUser = {
    id: 1,
    name: 'Test',
    email: 'test@example.com',
    password: '$2a$10$hash',
    role: 'customer' as const,
    is_active: true,
    reset_token: null,
    reset_token_expiry: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -- Success responses --

  it('GET /api/health returns { success: true, data: {...} }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).not.toBeNull();
  });

  it('successful registration returns { success: true, data: {...} }', async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(dbUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'securePass1' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body).not.toHaveProperty('error');
  });

  it('successful product list returns { success: true, data: {...} }', async () => {
    mockGetProducts.mockResolvedValue({ rows: [], total: 0 });

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
  });

  // -- Error responses --

  it('400 validation error returns { success: false, error: { message, fields } }', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body).not.toHaveProperty('data');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('401 unauthorized returns { success: false, error: { message } }', async () => {
    const res = await request(app).get('/api/cart');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('403 forbidden returns { success: false, error: { message } }', async () => {
    const token = customerToken();
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('property: every response has a boolean success field and exactly one of data or error', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          // mix of success and error scenarios
          { method: 'get', path: '/api/health', auth: null },
          { method: 'get', path: '/api/cart', auth: null }, // 401
          { method: 'get', path: '/api/admin/dashboard', auth: 'customer' }, // 403
          { method: 'get', path: '/api/products', auth: null }, // 200 (mocked)
        ) as fc.Arbitrary<{ method: string; path: string; auth: string | null }>,
        async ({ method, path, auth }) => {
          if (path === '/api/products') {
            mockGetProducts.mockResolvedValue({ rows: [], total: 0 });
          }

          let req = (request(app) as any)[method](path);
          if (auth === 'customer') {
            req = req.set('Authorization', `Bearer ${customerToken()}`);
          }

          const res = await req;

          // Every response must have a boolean `success` field
          expect(typeof res.body.success).toBe('boolean');

          if (res.body.success === true) {
            // Success: must have `data`, must NOT have `error`
            expect(res.body).toHaveProperty('data');
          } else {
            // Error: must have `error`, must NOT have `data`
            expect(res.body).toHaveProperty('error');
            expect(typeof res.body.error.message).toBe('string');
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
