import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  createUser,
  findUserByEmail,
  findUserByResetToken,
  setResetToken,
  clearResetToken,
  updateUserPassword,
} from '../models/user';
import { sendPasswordResetEmail } from '../utils/mailer';
import type { JwtPayload } from '../types';
import type { UserRow } from '../models/user';

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRY = '7d';

/**
 * Hash a plain-text password with bcrypt.
 * Cost factor is at least BCRYPT_ROUNDS (10).
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

/**
 * Sign a JWT for the given user payload.
 * Expiry is always 7 days.
 * Throws if JWT_SECRET is not set in the environment.
 */
export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRY });
}

export interface RegisterResult {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    created_at: Date;
  };
}

/**
 * Register a new customer account.
 *
 * - Checks for duplicate email → throws a 409-coded error if found
 * - Hashes the password with bcrypt (cost ≥ 10)
 * - Creates the user record
 * - Issues a 7-day JWT containing { id, email, role }
 * - Never returns the hashed password
 */
export interface LoginResult {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    created_at: Date;
  };
}

/**
 * Authenticate a user with email + password.
 *
 * - Unrecognized email OR incorrect password → throws 401 (same message to prevent enumeration)
 * - Account with is_active = false → throws 403 Forbidden
 * - On success: issues a 7-day JWT and returns public user data (no password)
 */
export async function loginUser(params: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const INVALID_CREDENTIALS_MSG = 'Invalid email or password.';

  // Look up user — use a single error message whether user doesn't exist or
  // password is wrong to prevent email enumeration.
  const user: UserRow | null = await findUserByEmail(params.email);

  if (!user) {
    const err = Object.assign(new Error(INVALID_CREDENTIALS_MSG), { status: 401 });
    throw err;
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(params.password, user.password);
  if (!passwordMatch) {
    const err = Object.assign(new Error(INVALID_CREDENTIALS_MSG), { status: 401 });
    throw err;
  }

  // Check account is active (requirement 15.3)
  if (!user.is_active) {
    const err = Object.assign(
      new Error('Your account has been deactivated. Please contact support.'),
      { status: 403 },
    );
    throw err;
  }

  // Issue JWT — never include the password hash
  const token = signJwt({ id: user.id, email: user.email, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
  };
}

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
}): Promise<RegisterResult> {
  // Duplicate-email check
  const existing = await findUserByEmail(params.email);
  if (existing) {
    const err = Object.assign(new Error('An account with this email already exists.'), {
      status: 409,
    });
    throw err;
  }

  // Hash password
  const passwordHash = await hashPassword(params.password);

  // Persist user
  const user = await createUser({
    name: params.name,
    email: params.email,
    passwordHash,
  });

  // Issue JWT — never include the password hash
  const token = signJwt({ id: user.id, email: user.email, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
  };
}

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Initiate a password-reset flow for the given email.
 *
 * - If the email IS registered: generate a cryptographically random token,
 *   persist it with a 1-hour expiry, and send a reset link via email.
 * - If the email is NOT registered: do nothing (silent — requirement 3.4).
 * - Always resolves successfully; never throws or rejects based on whether
 *   the email exists (prevents email enumeration).
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await findUserByEmail(email);
  if (!user) {
    // Requirement 3.4: do not reveal whether the email is registered
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await setResetToken(user.id, token, expiry);
  await sendPasswordResetEmail(user.email, token);
}

/**
 * Complete a password-reset using a token.
 *
 * - Looks up the user by reset_token.
 * - If the token does not exist or has expired → throws a 400 error.
 * - If valid: hashes the new password, updates the user record, and clears
 *   the reset token so it cannot be reused (requirement 3.3).
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const user = await findUserByResetToken(token);

  if (!user || !user.reset_token_expiry) {
    const err = Object.assign(
      new Error('Invalid or expired password reset token.'),
      { status: 400 },
    );
    throw err;
  }

  if (user.reset_token_expiry < new Date()) {
    const err = Object.assign(
      new Error('Invalid or expired password reset token.'),
      { status: 400 },
    );
    throw err;
  }

  const passwordHash = await hashPassword(newPassword);
  await updateUserPassword(user.id, passwordHash);
  await clearResetToken(user.id);
}
