import pool from '../db';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'admin';
  is_active: boolean;
  reset_token: string | null;
  reset_token_expiry: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Find a user by email address.
 * Returns the full row including the hashed password (callers must never
 * expose this in API responses).
 */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email],
  );
  return rows[0] ?? null;
}

/**
 * Insert a new user and return the created row.
 * The caller is responsible for passing an already-hashed password.
 */
export async function createUser(params: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<UserRow> {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [params.name, params.email, params.passwordHash],
  );
  return rows[0];
}

/**
 * Find a user by their password-reset token.
 * Returns the full row, or null if no user has that token.
 */
export async function findUserByResetToken(token: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE reset_token = $1 LIMIT 1',
    [token],
  );
  return rows[0] ?? null;
}

/**
 * Store a reset token and its expiry timestamp for the given user.
 */
export async function setResetToken(
  userId: number,
  token: string,
  expiry: Date,
): Promise<void> {
  await pool.query(
    `UPDATE users SET reset_token = $1, reset_token_expiry = $2, updated_at = NOW()
     WHERE id = $3`,
    [token, expiry, userId],
  );
}

/**
 * Clear the reset token and expiry for the given user (token used or invalidated).
 */
export async function clearResetToken(userId: number): Promise<void> {
  await pool.query(
    `UPDATE users SET reset_token = NULL, reset_token_expiry = NULL, updated_at = NOW()
     WHERE id = $1`,
    [userId],
  );
}

/**
 * Update the password hash for the given user.
 * The caller is responsible for passing an already-hashed password.
 */
export async function updateUserPassword(
  userId: number,
  passwordHash: string,
): Promise<void> {
  await pool.query(
    `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
    [passwordHash, userId],
  );
}
