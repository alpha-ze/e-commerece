import { Request, Response, NextFunction } from 'express';
import {
  getProfile,
  updateProfile,
  listAddresses,
  addAddress,
  editAddress,
  removeAddress,
} from '../services/profile';
import type { ApiResponse } from '../types';
import type { ProfileResult, AddressResult } from '../services/profile';

// ── Helper ────────────────────────────────────────────────────────────────────

function isCodedError(err: unknown): err is Error & { code: string } {
  return err instanceof Error && typeof (err as { code?: string }).code === 'string';
}

// ── Profile handlers ──────────────────────────────────────────────────────────

/**
 * GET /api/profile
 *
 * Returns the authenticated customer's profile (id, name, email, role,
 * created_at). The password field is never included.
 *
 * Response shape:
 *   200  { success: true, data: { id, name, email, role, created_at } }
 *
 * Validates: Requirement 9.1
 */
export async function getProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await getProfile(userId);

    const body: ApiResponse<ProfileResult> = { success: true, data: profile };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/profile
 *
 * Updates the authenticated customer's name and/or email.
 *
 * Body: { name?: string, email?: string }
 *
 * Response shape:
 *   200  { success: true, data: { id, name, email, role, created_at } }
 *   400  { success: false, error: { message: "..." } }
 *   409  { success: false, error: { message: "Email is already in use ..." } }
 *
 * Validates: Requirements 9.1, 9.2
 */
export async function updateProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, email } = req.body as { name?: unknown; email?: unknown };

    // Input validation
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'name must be a non-empty string' },
      };
      res.status(400).json(body);
      return;
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || email.trim() === '') {
        const body: ApiResponse<never> = {
          success: false,
          error: { message: 'email must be a non-empty string' },
        };
        res.status(400).json(body);
        return;
      }
      // Basic email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        const body: ApiResponse<never> = {
          success: false,
          error: { message: 'email must be a valid email address' },
        };
        res.status(400).json(body);
        return;
      }
    }

    if (name === undefined && email === undefined) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'At least one of name or email is required' },
      };
      res.status(400).json(body);
      return;
    }

    const profile = await updateProfile({
      userId,
      name: typeof name === 'string' ? name.trim() : undefined,
      email: typeof email === 'string' ? email.trim() : undefined,
    });

    const body: ApiResponse<ProfileResult> = { success: true, data: profile };
    res.status(200).json(body);
  } catch (err) {
    if (isCodedError(err)) {
      if (err.code === 'EMAIL_CONFLICT') {
        const body: ApiResponse<never> = {
          success: false,
          error: { message: err.message },
        };
        res.status(409).json(body);
        return;
      }
      if (err.code === 'VALIDATION') {
        const body: ApiResponse<never> = {
          success: false,
          error: { message: err.message },
        };
        res.status(400).json(body);
        return;
      }
    }
    next(err);
  }
}

// ── Address handlers ──────────────────────────────────────────────────────────

/**
 * GET /api/profile/addresses
 *
 * Returns all addresses for the authenticated customer.
 *
 * Response shape:
 *   200  { success: true, data: [...] }
 *
 * Validates: Requirement 9.3
 */
export async function getAddressesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const addresses = await listAddresses(userId);

    const body: ApiResponse<AddressResult[]> = { success: true, data: addresses };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/profile/addresses
 *
 * Adds a new address for the authenticated customer.
 * If is_default is true, all existing defaults are cleared first.
 *
 * Body: { street, city, state, postal_code, country, is_default? }
 *
 * Response shape:
 *   201  { success: true, data: { id, user_id, street, city, state, postal_code, country, is_default, created_at } }
 *   400  { success: false, error: { message: "..." } }
 *
 * Validates: Requirements 9.3, 9.5
 */
export async function addAddressHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { street, city, state, postal_code, country, is_default } = req.body as {
      street?: unknown;
      city?: unknown;
      state?: unknown;
      postal_code?: unknown;
      country?: unknown;
      is_default?: unknown;
    };

    // Required field validation
    const missingFields: string[] = [];
    if (!street || typeof street !== 'string' || street.trim() === '') missingFields.push('street');
    if (!city || typeof city !== 'string' || city.trim() === '') missingFields.push('city');
    if (!state || typeof state !== 'string' || state.trim() === '') missingFields.push('state');
    if (!postal_code || typeof postal_code !== 'string' || postal_code.trim() === '') missingFields.push('postal_code');
    if (!country || typeof country !== 'string' || country.trim() === '') missingFields.push('country');

    if (missingFields.length > 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: {
          message: `Missing or invalid required fields: ${missingFields.join(', ')}`,
          fields: missingFields,
        },
      };
      res.status(400).json(body);
      return;
    }

    const address = await addAddress({
      userId,
      street: (street as string).trim(),
      city: (city as string).trim(),
      state: (state as string).trim(),
      postal_code: (postal_code as string).trim(),
      country: (country as string).trim(),
      is_default: is_default === true || is_default === 'true',
    });

    const body: ApiResponse<AddressResult> = { success: true, data: address };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/profile/addresses/:id
 *
 * Updates an address belonging to the authenticated customer.
 * If is_default is true, all existing defaults are cleared first.
 *
 * Body: { street?, city?, state?, postal_code?, country?, is_default? }
 *
 * Response shape:
 *   200  { success: true, data: { ... } }
 *   400  { success: false, error: { message: "..." } }
 *   404  { success: false, error: { message: "Address not found" } }
 *
 * Validates: Requirements 9.3, 9.5
 */
export async function updateAddressHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const addressId = parseInt(req.params.id, 10);

    if (!Number.isFinite(addressId) || addressId <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Address not found' },
      };
      res.status(404).json(body);
      return;
    }

    const { street, city, state, postal_code, country, is_default } = req.body as {
      street?: unknown;
      city?: unknown;
      state?: unknown;
      postal_code?: unknown;
      country?: unknown;
      is_default?: unknown;
    };

    // Validate any provided string fields are non-empty
    const invalidFields: string[] = [];
    if (street !== undefined && (typeof street !== 'string' || street.trim() === '')) invalidFields.push('street');
    if (city !== undefined && (typeof city !== 'string' || city.trim() === '')) invalidFields.push('city');
    if (state !== undefined && (typeof state !== 'string' || state.trim() === '')) invalidFields.push('state');
    if (postal_code !== undefined && (typeof postal_code !== 'string' || postal_code.trim() === '')) invalidFields.push('postal_code');
    if (country !== undefined && (typeof country !== 'string' || country.trim() === '')) invalidFields.push('country');

    if (invalidFields.length > 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: {
          message: `Invalid fields: ${invalidFields.join(', ')}`,
          fields: invalidFields,
        },
      };
      res.status(400).json(body);
      return;
    }

    const address = await editAddress({
      userId,
      addressId,
      street: typeof street === 'string' ? street.trim() : undefined,
      city: typeof city === 'string' ? city.trim() : undefined,
      state: typeof state === 'string' ? state.trim() : undefined,
      postal_code: typeof postal_code === 'string' ? postal_code.trim() : undefined,
      country: typeof country === 'string' ? country.trim() : undefined,
      is_default: is_default === true || is_default === 'true' ? true
        : is_default === false || is_default === 'false' ? false
        : undefined,
    });

    const body: ApiResponse<AddressResult> = { success: true, data: address };
    res.status(200).json(body);
  } catch (err) {
    if (isCodedError(err) && err.code === 'NOT_FOUND') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: err.message },
      };
      res.status(404).json(body);
      return;
    }
    next(err);
  }
}

/**
 * DELETE /api/profile/addresses/:id
 *
 * Deletes an address belonging to the authenticated customer.
 *
 * Response shape:
 *   200  { success: true, data: { message: "Address deleted" } }
 *   404  { success: false, error: { message: "Address not found" } }
 *
 * Validates: Requirement 9.4
 */
export async function deleteAddressHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const addressId = parseInt(req.params.id, 10);

    if (!Number.isFinite(addressId) || addressId <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Address not found' },
      };
      res.status(404).json(body);
      return;
    }

    await removeAddress({ userId, addressId });

    const body: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Address deleted' },
    };
    res.status(200).json(body);
  } catch (err) {
    if (isCodedError(err) && err.code === 'NOT_FOUND') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: err.message },
      };
      res.status(404).json(body);
      return;
    }
    next(err);
  }
}
