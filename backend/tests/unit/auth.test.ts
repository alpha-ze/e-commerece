/**
 * Unit tests for auth endpoints:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password/:token
 *
 * Tests HTTP-level behaviour (status codes, response envelopes) using supertest,
 * with DB model functions and the mailer mocked so no live DB/SMTP is needed.
 */

// ── Set required env vars before app is loaded ──────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

// ── Mock the model layer so no real DB calls are made ────────────────────────
jest.mock('../../src/models/user', () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  findUserByResetToken: jest.fn(),
  setResetToken: jest.fn(),
  clearResetToken: jest.fn(),
  updateUserPassword: jest.fn(),
}));

// ── Mock the mailer so no real SMTP calls are made ──────────────────────────
jest.mock('../../src/utils/mailer', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import {
  findUserByEmail,
  createUser,
  findUserByResetToken,
  setResetToken,
  clearResetToken,
  updateUserPassword,
} from '../../src/models/user';
import { sendPasswordResetEmail } from '../../src/utils/mailer';
import type { JwtPayload } from '../../src/types';

const mockFindUserByEmail = findUserByEmail as jest.Mock;
const mockCreateUser = createUser as jest.Mock;
const mockFindUserByResetToken = findUserByResetToken as jest.Mock;
const mockSetResetToken = setResetToken as jest.Mock;
const mockClearResetToken = clearResetToken as jest.Mock;
const mockUpdateUserPassword = updateUserPassword as jest.Mock;
const mockSendPasswordResetEmail = sendPasswordResetEmail as jest.Mock;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const validBody = {
  name: 'Alice Smith',
  email: 'alice@example.com',
  password: 'securePass1',
};

const dbUserRow = {
  id: 1,
  name: 'Alice Smith',
  email: 'alice@example.com',
  password: '$2a$10$hashedpassword',
  role: 'customer' as const,
  is_active: true,
  reset_token: null,
  reset_token_expiry: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('returns 201 with token and user on valid input', async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(dbUserRow);

    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');
  });

  it('returns a valid JWT containing id, email, role with 7-day expiry', async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(dbUserRow);

    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.status).toBe(201);

    const decoded = jwt.verify(
      res.body.data.token,
      process.env.JWT_SECRET!,
    ) as JwtPayload;

    expect(decoded.id).toBe(dbUserRow.id);
    expect(decoded.email).toBe(dbUserRow.email);
    expect(decoded.role).toBe(dbUserRow.role);

    // exp - iat should be ~7 days (604800 s), allow 60s drift
    const durationSecs = decoded.exp! - decoded.iat!;
    expect(durationSecs).toBeGreaterThanOrEqual(604800 - 60);
    expect(durationSecs).toBeLessThanOrEqual(604800 + 60);
  });

  it('never returns the hashed password in the response body', async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(dbUserRow);

    const res = await request(app).post('/api/auth/register').send(validBody);

    const bodyStr = JSON.stringify(res.body);
    // The word "password" must not appear in the response at any nesting level
    expect(bodyStr).not.toMatch(/\"password\"/);
    expect(bodyStr).not.toMatch(/\"hash\"/);
  });

  it('hashes the password with bcrypt (cost ≥ 10) before persisting', async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(dbUserRow);

    await request(app).post('/api/auth/register').send(validBody);

    expect(mockCreateUser).toHaveBeenCalledTimes(1);
    const { passwordHash } = mockCreateUser.mock.calls[0][0];

    // Must not be stored as plaintext
    expect(passwordHash).not.toBe(validBody.password);

    // Must be a valid bcrypt hash that verifies against the original password
    const isValid = await bcrypt.compare(validBody.password, passwordHash);
    expect(isValid).toBe(true);

    // Verify cost factor is at least 10
    const rounds = bcrypt.getRounds(passwordHash);
    expect(rounds).toBeGreaterThanOrEqual(10);
  });

  // ── Duplicate email (409) ──────────────────────────────────────────────────

  it('returns 409 Conflict when email already exists', async () => {
    // Simulate finding an existing user with this email
    mockFindUserByEmail.mockResolvedValue(dbUserRow);

    const res = await request(app)
      .post('/api/auth/register')
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/already exists/i);
    // createUser must never be called
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  // ── Validation errors (400) ────────────────────────────────────────────────

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'validpass1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('fields');
    const fields = res.body.error.fields as Array<{ field: string }>;
    expect(fields.some((f) => f.field === 'name')).toBe(true);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', password: 'validpass1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const fields = res.body.error.fields as Array<{ field: string }>;
    expect(fields.some((f) => f.field === 'email')).toBe(true);
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'not-an-email', password: 'validpass1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const fields = res.body.error.fields as Array<{ field: string }>;
    expect(fields.some((f) => f.field === 'email')).toBe(true);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const fields = res.body.error.fields as Array<{ field: string }>;
    expect(fields.some((f) => f.field === 'password')).toBe(true);
  });

  it('returns 400 when password is fewer than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const fields = res.body.error.fields as Array<{ field: string }>;
    expect(fields.some((f) => f.field === 'password')).toBe(true);
  });

  it('returns 400 with fields array listing all invalid fields when multiple fields fail', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const fields = res.body.error.fields as Array<{ field: string }>;
    // name is missing, email format invalid, password too short
    expect(fields.length).toBeGreaterThanOrEqual(2);
  });

  it('returns 400 when body is completely empty', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Response envelope ──────────────────────────────────────────────────────

  it('success response follows the standard envelope { success: true, data: {...} }', async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(dbUserRow);

    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
  });

  it('error response follows the standard envelope { success: false, error: { message, fields } }', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x' });

    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('fields');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  // A hashed version of 'securePass1' to use in fixtures
  // We pre-hash in beforeAll so tests don't slow down with bcrypt per-test
  let hashedPassword: string;

  beforeAll(async () => {
    const bcryptModule = await import('bcryptjs');
    hashedPassword = await bcryptModule.default.hash('securePass1', 10);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const loginBody = {
    email: 'alice@example.com',
    password: 'securePass1',
  };

  // Helper to build a db user row with the pre-hashed password
  const makeDbUser = (overrides: Partial<typeof dbUserRow> = {}) => ({
    ...dbUserRow,
    password: hashedPassword,
    ...overrides,
  });

  // ── Happy path (200) ───────────────────────────────────────────────────────

  it('returns 200 with token and user on valid credentials', async () => {
    mockFindUserByEmail.mockResolvedValue(makeDbUser());

    const res = await request(app).post('/api/auth/login').send(loginBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');
  });

  it('returns a valid JWT containing id, email, role with 7-day expiry', async () => {
    mockFindUserByEmail.mockResolvedValue(makeDbUser());

    const res = await request(app).post('/api/auth/login').send(loginBody);

    expect(res.status).toBe(200);

    const decoded = jwt.verify(
      res.body.data.token,
      process.env.JWT_SECRET!,
    ) as JwtPayload;

    expect(decoded.id).toBe(dbUserRow.id);
    expect(decoded.email).toBe(dbUserRow.email);
    expect(decoded.role).toBe(dbUserRow.role);

    // exp - iat should be ~7 days (604800 s), allow 60 s drift
    const durationSecs = decoded.exp! - decoded.iat!;
    expect(durationSecs).toBeGreaterThanOrEqual(604800 - 60);
    expect(durationSecs).toBeLessThanOrEqual(604800 + 60);
  });

  it('never returns the password in the response body', async () => {
    mockFindUserByEmail.mockResolvedValue(makeDbUser());

    const res = await request(app).post('/api/auth/login').send(loginBody);

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toMatch(/"password"/);
    expect(bodyStr).not.toMatch(/"hash"/);
  });

  // ── Wrong password (401) ───────────────────────────────────────────────────

  it('returns 401 Unauthorized for an incorrect password', async () => {
    mockFindUserByEmail.mockResolvedValue(makeDbUser());

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('message');
  });

  // ── Non-existent email (401) ───────────────────────────────────────────────

  it('returns 401 Unauthorized for a non-existent email', async () => {
    mockFindUserByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'securePass1' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('message');
  });

  it('returns the same error message for wrong password and non-existent email (no enumeration)', async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    const resNoUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'securePass1' });

    mockFindUserByEmail.mockResolvedValue(makeDbUser());
    const resWrongPass = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrongPassword!' });

    expect(resNoUser.body.error.message).toBe(resWrongPass.body.error.message);
  });

  // ── Deactivated account (403) ──────────────────────────────────────────────

  it('returns 403 Forbidden when the account is deactivated', async () => {
    mockFindUserByEmail.mockResolvedValue(makeDbUser({ is_active: false }));

    const res = await request(app).post('/api/auth/login').send(loginBody);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('message');
  });

  // ── Validation errors (400) ────────────────────────────────────────────────

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'securePass1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('fields');
    const fields = res.body.error.fields as Array<{ field: string }>;
    expect(fields.some((f) => f.field === 'email')).toBe(true);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('fields');
    const fields = res.body.error.fields as Array<{ field: string }>;
    expect(fields.some((f) => f.field === 'password')).toBe(true);
  });

  it('returns 400 when body is completely empty', async () => {
    const res = await request(app).post('/api/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Response envelope ──────────────────────────────────────────────────────

  it('success response follows the standard envelope { success: true, data: {...} }', async () => {
    mockFindUserByEmail.mockResolvedValue(makeDbUser());

    const res = await request(app).post('/api/auth/login').send(loginBody);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');
  });

  it('error response follows the standard envelope { success: false, error: { message } }', async () => {
    mockFindUserByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'securePass1' });

    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('message');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: model calls succeed silently
    mockSetResetToken.mockResolvedValue(undefined);
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
  });

  // ── Registered email ───────────────────────────────────────────────────────

  it('returns 200 OK and sends reset email when email is registered', async () => {
    mockFindUserByEmail.mockResolvedValue(dbUserRow);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('message');

    // Token was stored and email was dispatched
    expect(mockSetResetToken).toHaveBeenCalledTimes(1);
    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      dbUserRow.email,
      expect.any(String),
    );
  });

  it('stores a hex reset token and a 1-hour expiry', async () => {
    mockFindUserByEmail.mockResolvedValue(dbUserRow);

    const before = Date.now();
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'alice@example.com' });
    const after = Date.now();

    const [, token, expiry] = mockSetResetToken.mock.calls[0] as [
      number,
      string,
      Date,
    ];

    // Token should be a 64-character hex string (32 bytes)
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    // Expiry should be ~1 hour from now
    const expiryMs = expiry.getTime();
    const oneHour = 60 * 60 * 1000;
    expect(expiryMs).toBeGreaterThanOrEqual(before + oneHour - 100);
    expect(expiryMs).toBeLessThanOrEqual(after + oneHour + 100);
  });

  // ── Unregistered email (requirement 3.4) ──────────────────────────────────

  it('returns 200 OK even when email is NOT registered (no enumeration)', async () => {
    mockFindUserByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // No token or email side-effects
    expect(mockSetResetToken).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('returns the same response body for registered and unregistered emails', async () => {
    mockFindUserByEmail.mockResolvedValueOnce(dbUserRow);
    const resRegistered = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'alice@example.com' });

    mockFindUserByEmail.mockResolvedValueOnce(null);
    const resUnknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(resRegistered.status).toBe(200);
    expect(resUnknown.status).toBe(200);
    expect(resRegistered.body.success).toBe(resUnknown.body.success);
    expect(resRegistered.body.data.message).toBe(resUnknown.body.data.message);
  });

  // ── Validation (400) ───────────────────────────────────────────────────────

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const fields = res.body.error.fields as Array<{ field: string }>;
    expect(fields.some((f) => f.field === 'email')).toBe(true);
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Response envelope ──────────────────────────────────────────────────────

  it('success response follows the standard envelope { success: true, data: {...} }', async () => {
    mockFindUserByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'alice@example.com' });

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for POST /api/auth/reset-password/:token
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/reset-password/:token', () => {
  const VALID_TOKEN = 'a'.repeat(64);
  const NEW_PASSWORD = 'newSecurePass1';

  /** User row with a valid (future) token expiry */
  const userWithValidToken = {
    ...dbUserRow,
    reset_token: VALID_TOKEN,
    reset_token_expiry: new Date(Date.now() + 30 * 60 * 1000), // 30 min in future
  };

  /** User row with an expired token */
  const userWithExpiredToken = {
    ...dbUserRow,
    reset_token: VALID_TOKEN,
    reset_token_expiry: new Date(Date.now() - 1000), // 1 second in the past
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUserPassword.mockResolvedValue(undefined);
    mockClearResetToken.mockResolvedValue(undefined);
  });

  // ── Happy path (200) ───────────────────────────────────────────────────────

  it('returns 200 and updates the password on a valid token', async () => {
    mockFindUserByResetToken.mockResolvedValue(userWithValidToken);

    const res = await request(app)
      .post(`/api/auth/reset-password/${VALID_TOKEN}`)
      .send({ password: NEW_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('message');
  });

  it('hashes the new password with bcrypt before persisting (cost ≥ 10)', async () => {
    mockFindUserByResetToken.mockResolvedValue(userWithValidToken);

    await request(app)
      .post(`/api/auth/reset-password/${VALID_TOKEN}`)
      .send({ password: NEW_PASSWORD });

    expect(mockUpdateUserPassword).toHaveBeenCalledTimes(1);
    const [, storedHash] = mockUpdateUserPassword.mock.calls[0] as [number, string];

    expect(storedHash).not.toBe(NEW_PASSWORD);
    const isValid = await bcrypt.compare(NEW_PASSWORD, storedHash);
    expect(isValid).toBe(true);
    expect(bcrypt.getRounds(storedHash)).toBeGreaterThanOrEqual(10);
  });

  it('clears the reset token after a successful reset (requirement 3.3)', async () => {
    mockFindUserByResetToken.mockResolvedValue(userWithValidToken);

    await request(app)
      .post(`/api/auth/reset-password/${VALID_TOKEN}`)
      .send({ password: NEW_PASSWORD });

    expect(mockClearResetToken).toHaveBeenCalledTimes(1);
    expect(mockClearResetToken).toHaveBeenCalledWith(userWithValidToken.id);
  });

  // ── Invalid / expired token (400) — requirement 3.2 ──────────────────────

  it('returns 400 when the token does not exist', async () => {
    mockFindUserByResetToken.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/reset-password/nonexistenttoken')
      .send({ password: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('message');
    expect(mockUpdateUserPassword).not.toHaveBeenCalled();
  });

  it('returns 400 when the token has expired (requirement 3.2)', async () => {
    mockFindUserByResetToken.mockResolvedValue(userWithExpiredToken);

    const res = await request(app)
      .post(`/api/auth/reset-password/${VALID_TOKEN}`)
      .send({ password: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockUpdateUserPassword).not.toHaveBeenCalled();
  });

  // ── Validation errors (400) ────────────────────────────────────────────────

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post(`/api/auth/reset-password/${VALID_TOKEN}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const fields = res.body.error.fields as Array<{ field: string }>;
    expect(fields.some((f) => f.field === 'password')).toBe(true);
  });

  it('returns 400 when new password is fewer than 8 characters', async () => {
    const res = await request(app)
      .post(`/api/auth/reset-password/${VALID_TOKEN}`)
      .send({ password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const fields = res.body.error.fields as Array<{ field: string }>;
    expect(fields.some((f) => f.field === 'password')).toBe(true);
  });

  // ── Response envelope ──────────────────────────────────────────────────────

  it('success response follows the standard envelope { success: true, data: {...} }', async () => {
    mockFindUserByResetToken.mockResolvedValue(userWithValidToken);

    const res = await request(app)
      .post(`/api/auth/reset-password/${VALID_TOKEN}`)
      .send({ password: NEW_PASSWORD });

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
  });

  it('error response follows the standard envelope { success: false, error: { message } }', async () => {
    mockFindUserByResetToken.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/reset-password/badtoken')
      .send({ password: NEW_PASSWORD });

    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('message');
  });
});
