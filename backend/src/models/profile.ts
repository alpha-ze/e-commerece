import pool from '../db';

// ── Row types ─────────────────────────────────────────────────────────────────

/**
 * Subset of the users row that is safe to return in API responses.
 * The password field is deliberately excluded.
 */
export interface UserProfileRow {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  created_at: Date;
}

/** A full address row as stored in the addresses table. */
export interface AddressRow {
  id: number;
  user_id: number;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: Date;
}

// ── User profile queries ──────────────────────────────────────────────────────

/**
 * Fetch the public profile fields for a user by ID.
 * Never returns the password field.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function getUserProfile(userId: number): Promise<UserProfileRow | null> {
  const { rows } = await pool.query<UserProfileRow>(
    `SELECT id, name, email, role, created_at
     FROM   users
     WHERE  id = $1
     LIMIT  1`,
    [userId],
  );
  return rows[0] ?? null;
}

/**
 * Update a user's name and/or email.
 * Returns the updated profile row, or null if the user was not found.
 *
 * Throws a PostgreSQL unique-violation error (code '23505') when the new
 * email is already taken — callers should convert this to a 409 response.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function updateUserProfile(
  userId: number,
  updates: { name?: string; email?: string },
): Promise<UserProfileRow | null> {
  const { name, email } = updates;

  const { rows } = await pool.query<UserProfileRow>(
    `UPDATE users
     SET    name       = COALESCE($1, name),
            email      = COALESCE($2, email),
            updated_at = NOW()
     WHERE  id         = $3
     RETURNING id, name, email, role, created_at`,
    [name ?? null, email ?? null, userId],
  );
  return rows[0] ?? null;
}

// ── Address queries ───────────────────────────────────────────────────────────

/**
 * List all addresses for a user, ordered by is_default desc then created_at asc.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function getAddresses(userId: number): Promise<AddressRow[]> {
  const { rows } = await pool.query<AddressRow>(
    `SELECT id, user_id, street, city, state, postal_code, country, is_default, created_at
     FROM   addresses
     WHERE  user_id = $1
     ORDER  BY is_default DESC, created_at ASC`,
    [userId],
  );
  return rows;
}

/**
 * Insert a new address for a user and return the created row.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function createAddress(
  userId: number,
  fields: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    is_default?: boolean;
  },
): Promise<AddressRow> {
  const { street, city, state, postal_code, country, is_default = false } = fields;

  const { rows } = await pool.query<AddressRow>(
    `INSERT INTO addresses (user_id, street, city, state, postal_code, country, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, street, city, state, postal_code, country, is_default, created_at`,
    [userId, street, city, state, postal_code, country, is_default],
  );
  return rows[0];
}

/**
 * Update an existing address that belongs to the given user.
 * Returns the updated row, or null if no matching address was found.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function updateAddress(
  addressId: number,
  userId: number,
  fields: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    is_default?: boolean;
  },
): Promise<AddressRow | null> {
  const { street, city, state, postal_code, country, is_default } = fields;

  const { rows } = await pool.query<AddressRow>(
    `UPDATE addresses
     SET    street      = COALESCE($1, street),
            city        = COALESCE($2, city),
            state       = COALESCE($3, state),
            postal_code = COALESCE($4, postal_code),
            country     = COALESCE($5, country),
            is_default  = COALESCE($6, is_default)
     WHERE  id = $7 AND user_id = $8
     RETURNING id, user_id, street, city, state, postal_code, country, is_default, created_at`,
    [
      street ?? null,
      city ?? null,
      state ?? null,
      postal_code ?? null,
      country ?? null,
      is_default ?? null,
      addressId,
      userId,
    ],
  );
  return rows[0] ?? null;
}

/**
 * Delete an address that belongs to the given user.
 * Returns true if a row was deleted, false if none matched.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function deleteAddress(
  addressId: number,
  userId: number,
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM addresses WHERE id = $1 AND user_id = $2`,
    [addressId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Unset is_default for all addresses belonging to a user.
 * Call this before setting a new default so at most one address is default at a time.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function clearDefaultAddress(userId: number): Promise<void> {
  await pool.query(
    `UPDATE addresses SET is_default = FALSE WHERE user_id = $1`,
    [userId],
  );
}
