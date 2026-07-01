import { Router } from 'express';
import { verifyJWT, requireRole } from '../middleware/auth';
import {
  getProfileHandler,
  updateProfileHandler,
  getAddressesHandler,
  addAddressHandler,
  updateAddressHandler,
  deleteAddressHandler,
} from '../controllers/profile';

const router = Router();

// All profile routes require a valid Customer (or Admin) JWT
const customerAuth = [verifyJWT, requireRole('customer', 'admin')];

/**
 * GET /api/profile
 *
 * Returns the authenticated customer's profile (id, name, email, role,
 * created_at). The password field is never included.
 *
 * Validates: Requirement 9.1
 */
router.get('/', customerAuth, getProfileHandler);

/**
 * PUT /api/profile
 *
 * Updates name and/or email for the authenticated customer.
 * Returns 409 if the new email is already taken by another user.
 *
 * Validates: Requirements 9.1, 9.2
 */
router.put('/', customerAuth, updateProfileHandler);

/**
 * GET /api/profile/addresses
 *
 * Returns all saved addresses for the authenticated customer.
 *
 * Validates: Requirement 9.3
 */
router.get('/addresses', customerAuth, getAddressesHandler);

/**
 * POST /api/profile/addresses
 *
 * Adds a new address. street, city, state, postal_code, and country are
 * required. If is_default is true all existing defaults are cleared first.
 *
 * Validates: Requirements 9.3, 9.5
 */
router.post('/addresses', customerAuth, addAddressHandler);

/**
 * PUT /api/profile/addresses/:id
 *
 * Updates an existing address belonging to the authenticated customer.
 * Returns 404 if the address does not exist or belongs to another user.
 * If is_default is true all existing defaults are cleared first.
 *
 * Validates: Requirements 9.3, 9.5
 */
router.put('/addresses/:id', customerAuth, updateAddressHandler);

/**
 * DELETE /api/profile/addresses/:id
 *
 * Deletes an address belonging to the authenticated customer.
 * Returns 404 if the address does not exist or belongs to another user.
 *
 * Validates: Requirement 9.4
 */
router.delete('/addresses/:id', customerAuth, deleteAddressHandler);

export default router;
