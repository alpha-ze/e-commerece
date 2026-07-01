import {
  getUserProfile,
  updateUserProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  clearDefaultAddress,
  type UserProfileRow,
  type AddressRow,
} from '../models/profile';

// ── Result shapes ─────────────────────────────────────────────────────────────

export type ProfileResult = UserProfileRow;  // id, name, email, role, created_at

export type AddressResult = AddressRow;

// ── Helper ────────────────────────────────────────────────────────────────────

/** Check if a PostgreSQL error is a unique-constraint violation. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as Record<string, unknown>)['code'] === 'string' &&
    (err as Record<string, unknown>)['code'] === '23505'
  );
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Get the authenticated customer's profile (no password field).
 *
 * Validates: Requirement 9.1
 */
export async function getProfile(userId: number): Promise<ProfileResult> {
  const profile = await getUserProfile(userId);
  if (!profile) {
    const err = new Error('User not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }
  return profile;
}

export interface UpdateProfileInput {
  userId: number;
  name?: string;
  email?: string;
}

/**
 * Update the authenticated customer's name and/or email.
 *
 * Throws with code 'EMAIL_CONFLICT' if the new email is already taken.
 * Throws with code 'VALIDATION' if neither name nor email is provided.
 *
 * Validates: Requirements 9.1, 9.2
 */
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ProfileResult> {
  const { userId, name, email } = input;

  if (name === undefined && email === undefined) {
    const err = new Error('At least one of name or email is required') as Error & {
      code: string;
    };
    err.code = 'VALIDATION';
    throw err;
  }

  try {
    const updated = await updateUserProfile(userId, { name, email });
    if (!updated) {
      const err = new Error('User not found') as Error & { code: string };
      err.code = 'NOT_FOUND';
      throw err;
    }
    return updated;
  } catch (err) {
    if (isUniqueViolation(err)) {
      const conflict = new Error('Email is already in use by another account') as Error & {
        code: string;
      };
      conflict.code = 'EMAIL_CONFLICT';
      throw conflict;
    }
    throw err;
  }
}

/**
 * List all addresses for the authenticated customer.
 *
 * Validates: Requirement 9.3
 */
export async function listAddresses(userId: number): Promise<AddressResult[]> {
  return getAddresses(userId);
}

export interface CreateAddressInput {
  userId: number;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

/**
 * Add a new address for the authenticated customer.
 * If is_default is true, all existing defaults are cleared first so only
 * one address is the default at a time.
 *
 * Validates: Requirements 9.3, 9.5
 */
export async function addAddress(input: CreateAddressInput): Promise<AddressResult> {
  const { userId, street, city, state, postal_code, country, is_default = false } = input;

  if (is_default) {
    await clearDefaultAddress(userId);
  }

  return createAddress(userId, { street, city, state, postal_code, country, is_default });
}

export interface UpdateAddressInput {
  userId: number;
  addressId: number;
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  is_default?: boolean;
}

/**
 * Update an existing address belonging to the authenticated customer.
 *
 * If is_default is true, all existing defaults are cleared first.
 * Throws with code 'NOT_FOUND' if the address doesn't exist or doesn't
 * belong to this user.
 *
 * Validates: Requirements 9.3, 9.5
 */
export async function editAddress(input: UpdateAddressInput): Promise<AddressResult> {
  const { userId, addressId, street, city, state, postal_code, country, is_default } = input;

  if (is_default === true) {
    await clearDefaultAddress(userId);
  }

  const updated = await updateAddress(addressId, userId, {
    street,
    city,
    state,
    postal_code,
    country,
    is_default,
  });

  if (!updated) {
    const err = new Error('Address not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }

  return updated;
}

export interface DeleteAddressInput {
  userId: number;
  addressId: number;
}

/**
 * Delete an address belonging to the authenticated customer.
 *
 * Throws with code 'NOT_FOUND' if the address doesn't exist or doesn't
 * belong to this user.
 *
 * Validates: Requirement 9.4
 */
export async function removeAddress(input: DeleteAddressInput): Promise<void> {
  const { userId, addressId } = input;

  const deleted = await deleteAddress(addressId, userId);
  if (!deleted) {
    const err = new Error('Address not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }
}
