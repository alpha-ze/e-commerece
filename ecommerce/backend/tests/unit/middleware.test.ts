/**
 * Unit tests for JWT middleware:
 *   verifyJWT  — extracts and validates Bearer tokens
 *   requireRole — enforces role-based access control
 *
 * Tests are HTTP-level: a minimal Express app is mounted per describe block
 * so middleware behaviour is validated end-to-end without touching the DB.
 */

// ── Env setup (must come before any src imports) ─────────────────────────────
process.env.JWT_SECRET = 'unit-test-secret';
process.env.NODE_ENV = 'test';

import request from 'supertest';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyJWT, requireRole } from '../../src/middleware/auth';
import type { JwtPayload } from '../../src/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = process.env.JWT_SECRET!;

/** Signs a valid JWT with the test secret. */
function makeToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresIn: string = '7d'): string {
  // Cast to any to work around @types/jsonwebtoken's StringValue constraint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, SECRET, { expiresIn } as any);
}

/**
 * Builds a minimal Express app that runs the supplied middlewares before a
 * test route that echoes `req.user` on success.
 */
function buildApp(...middlewares: express.RequestHandler[]) {
  const app = express();
  app.use(express.json());
  app.get(
    '/protected',
    ...middlewares,
    (req: Request, res: Response) => {
      res.status(200).json({ success: true, data: { user: req.user } });
    },
  );
  return app;
}

// ── verifyJWT tests ───────────────────────────────────────────────────────────

describe('verifyJWT', () => {
  const app = buildApp(verifyJWT);

  // ── Missing / malformed Authorization header ──────────────────────────────

  it('returns 401 when Authorization header is absent', async () => {
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('message');
  });

  it('returns 401 when Authorization header is not a Bearer token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when Authorization header is "Bearer " with no token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer ');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ── Invalid token ─────────────────────────────────────────────────────────

  it('returns 401 when the token signature is invalid', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer this.is.notavalidtoken');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('message');
  });

  it('returns 401 when the token is signed with a different secret', async () => {
    const wrongToken = jwt.sign(
      { id: 1, email: 'a@b.com', role: 'customer' },
      'wrong-secret',
    );

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${wrongToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ── Expired token ─────────────────────────────────────────────────────────

  it('returns 401 when the token is expired', async () => {
    // expiresIn: 0 → immediately expired
    const expiredToken = jwt.sign(
      { id: 1, email: 'a@b.com', role: 'customer' },
      SECRET,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { expiresIn: 0 } as any,
    );

    // Small delay to ensure the token has expired
    await new Promise((resolve) => setTimeout(resolve, 10));

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('message');
  });

  // ── Valid token ───────────────────────────────────────────────────────────

  it('calls next() and attaches the decoded payload to req.user on a valid token', async () => {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      id: 42,
      email: 'alice@example.com',
      role: 'customer',
    };
    const token = makeToken(payload);

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      id: payload.id,
      email: payload.email,
      role: payload.role,
    });
  });

  it('works correctly for an admin token', async () => {
    const token = makeToken({ id: 7, email: 'admin@example.com', role: 'admin' });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');
  });

  // ── Response envelope ─────────────────────────────────────────────────────

  it('error response follows the standard envelope { success: false, error: { message } }', async () => {
    const res = await request(app).get('/protected');

    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('message');
    expect(typeof res.body.error.message).toBe('string');
  });
});

// ── requireRole tests ─────────────────────────────────────────────────────────

describe('requireRole', () => {
  // ── No user on req (verifyJWT skipped) ────────────────────────────────────

  describe('when req.user is not set', () => {
    // Mount requireRole WITHOUT verifyJWT so req.user is undefined
    const app = buildApp(requireRole('customer', 'admin'));

    it('returns 401 when req.user is missing', async () => {
      const res = await request(app).get('/protected');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toHaveProperty('message');
    });
  });

  // ── Wrong role (403) ──────────────────────────────────────────────────────

  describe('when req.user has an insufficient role', () => {
    // Chain verifyJWT then requireRole('admin') — customer token should get 403
    const app = buildApp(verifyJWT, requireRole('admin'));

    it('returns 403 when a customer tries to access an admin-only route', async () => {
      const token = makeToken({ id: 1, email: 'user@example.com', role: 'customer' });

      const res = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toHaveProperty('message');
    });
  });

  // ── Correct role (200 / next called) ─────────────────────────────────────

  describe('when req.user has the correct role', () => {
    const adminApp = buildApp(verifyJWT, requireRole('admin'));
    const customerApp = buildApp(verifyJWT, requireRole('customer'));
    const bothApp = buildApp(verifyJWT, requireRole('customer', 'admin'));

    it('calls next() when the user role matches the single required role (admin)', async () => {
      const token = makeToken({ id: 2, email: 'admin@example.com', role: 'admin' });

      const res = await request(adminApp)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('calls next() when the user role matches the single required role (customer)', async () => {
      const token = makeToken({ id: 3, email: 'user@example.com', role: 'customer' });

      const res = await request(customerApp)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('calls next() for admin when both roles are accepted', async () => {
      const token = makeToken({ id: 4, email: 'admin@example.com', role: 'admin' });

      const res = await request(bothApp)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('calls next() for customer when both roles are accepted', async () => {
      const token = makeToken({ id: 5, email: 'user@example.com', role: 'customer' });

      const res = await request(bothApp)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('returns 403 when admin tries a customer-only route', async () => {
      const token = makeToken({ id: 6, email: 'admin@example.com', role: 'admin' });

      const res = await request(customerApp)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Response envelope ─────────────────────────────────────────────────────

  it('403 response follows the standard envelope { success: false, error: { message } }', async () => {
    const app = buildApp(verifyJWT, requireRole('admin'));
    const token = makeToken({ id: 1, email: 'user@example.com', role: 'customer' });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('message');
    expect(typeof res.body.error.message).toBe('string');
  });
});
