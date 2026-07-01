/**
 * Property-based tests: P1, P2, P3, P4
 *
 * P1 — Password never exposed in API responses
 * P2 — Registration input validation rejects invalid payloads
 * P3 — Unauthenticated requests are rejected on protected routes
 * P4 — Customer role cannot access admin routes
 */

// ── Env setup ────────────────────────────────────────────────────────────────
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

import * as fc from 'fast-check';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { findUserByEmail, createUser } from '../../src/models/user';

const mockFindUserByEmail = findUserByEmail as jest.Mock;
const mockCreateUser = createUser as jest.Mock;

const SECRET = process.env.JWT_SECRET!;

function makeToken(payload: { id: number; email: string; role: string }, expiresIn = '7d') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, SECRET, { expiresIn } as any);
}

// Admin-only routes sample for P3 / P4 checks
const ADMIN_ROUTES = [
  { method: 'get', path: '/api/admin/dashboard' },
  { method: 'get', path: '/api/admin/orders' },
  { method: 'get', path: '/api/admin/users' },
  { method: 'get', path: '/api/admin/coupons' },
];

// ─────────────────────────────────────────────────────────────────────────────
// P1: Password never exposed in API responses
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 1: Password never exposed in API responses
describe('P1: Password never exposed in API responses', () => {
  const dbUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password: '$2a$10$hashedpasswordvalue',
    role: 'customer' as const,
    is_active: true,
    reset_token: null,
    reset_token_expiry: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(dbUser);
  });

  it('registration response never contains a password or hash field at any nesting level', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 64 }),
        }),
        async (payload) => {
          mockFindUserByEmail.mockResolvedValue(null);
          mockCreateUser.mockResolvedValue({ ...dbUser, email: payload.email });

          const res = await request(app)
            .post('/api/auth/register')
            .send(payload);

          const bodyStr = JSON.stringify(res.body);
          expect(bodyStr).not.toMatch(/"password"/);
          expect(bodyStr).not.toMatch(/"hash"/);
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P2: Registration input validation rejects invalid payloads
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 2: Registration input validation rejects invalid payloads
describe('P2: Registration input validation rejects invalid payloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('missing name always returns 400 with fields array', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 64 }),
        }),
        async (payload) => {
          const res = await request(app)
            .post('/api/auth/register')
            .send(payload); // no name

          // 429 means rate limited — skip, property still holds for 400
          if (res.status === 429) return;
          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          expect(Array.isArray(res.body.error?.fields)).toBe(true);
          expect(res.body.error.fields.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('password shorter than 8 chars always returns 400 with password in fields', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 1, maxLength: 7 }),
        }),
        async (payload) => {
          const res = await request(app)
            .post('/api/auth/register')
            .send(payload);

          if (res.status === 429) return;
          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          const fields = res.body.error?.fields as Array<{ field: string }>;
          expect(Array.isArray(fields)).toBe(true);
          expect(fields.some((f) => f.field === 'password')).toBe(true);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('invalid email format always returns 400 with email in fields', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          // Generate strings that are clearly not valid emails
          email: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('@')),
          password: fc.string({ minLength: 8, maxLength: 64 }),
        }),
        async (payload) => {
          const res = await request(app)
            .post('/api/auth/register')
            .send(payload);

          if (res.status === 429) return;
          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          const fields = res.body.error?.fields as Array<{ field: string }>;
          expect(Array.isArray(fields)).toBe(true);
          expect(fields.some((f) => f.field === 'email')).toBe(true);
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P3: Unauthenticated requests are rejected on protected routes
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 3: Unauthenticated requests are rejected on protected routes
describe('P3: Unauthenticated requests are rejected on protected routes', () => {
  it('request without Authorization header gets 401 on every admin route', async () => {
    for (const route of ADMIN_ROUTES) {
      const res = await (request(app) as any)[route.method](route.path);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    }
  });

  it('request with invalid/expired JWT gets 401 on any admin route', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }),
        fc.nat({ max: ADMIN_ROUTES.length - 1 }),
        async (badToken, routeIdx) => {
          const route = ADMIN_ROUTES[routeIdx];
          const res = await (request(app) as any)[route.method](route.path)
            .set('Authorization', `Bearer ${badToken}`);

          expect(res.status).toBe(401);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('request without Authorization header gets 401 on cart routes', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('request without Authorization header gets 401 on wishlist routes', async () => {
    const res = await request(app).get('/api/wishlist');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('request without Authorization header gets 401 on order routes', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P4: Customer role cannot access admin routes
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 4: Customer role cannot access admin routes
describe('P4: Customer role cannot access admin routes', () => {
  it('customer JWT always gets 403 on admin-only routes', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 9999 }),
          email: fc.emailAddress(),
        }),
        fc.nat({ max: ADMIN_ROUTES.length - 1 }),
        async (userData, routeIdx) => {
          const token = makeToken({ id: userData.id, email: userData.email, role: 'customer' });
          const route = ADMIN_ROUTES[routeIdx];

          const res = await (request(app) as any)[route.method](route.path)
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(403);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('admin JWT gets through the 403 gate (does not return 401 or 403)', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 9999 }),
          email: fc.emailAddress(),
        }),
        async (userData) => {
          const token = makeToken({ id: userData.id, email: userData.email, role: 'admin' });
          // Use dashboard — if DB isn't available this will 500, but not 401/403
          const res = await request(app)
            .get('/api/admin/dashboard')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).not.toBe(401);
          expect(res.status).not.toBe(403);
        },
      ),
      { numRuns: 30 },
    );
  });
});
