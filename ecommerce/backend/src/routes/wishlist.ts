import { Router } from 'express';
import { verifyJWT, requireRole } from '../middleware/auth';
import {
  getWishlistHandler,
  addToWishlistHandler,
  removeFromWishlistHandler,
} from '../controllers/wishlist';

const router = Router();

// All wishlist routes require a valid Customer (or Admin) JWT
const customerAuth = [verifyJWT, requireRole('customer', 'admin')];

/**
 * GET /api/wishlist
 *
 * Returns the authenticated customer's wishlist.
 * Each item includes product_name, primary_image, price, and discount_price.
 *
 * Validates: Requirement 8.1
 */
router.get('/', customerAuth, getWishlistHandler);

/**
 * POST /api/wishlist
 *
 * Adds a product to the wishlist.
 * Returns 409 if the product is already present.
 *
 * Validates: Requirements 8.2, 8.3
 */
router.post('/', customerAuth, addToWishlistHandler);

/**
 * DELETE /api/wishlist/:productId
 *
 * Removes a product from the wishlist by product ID.
 * Returns the updated wishlist.
 *
 * Validates: Requirement 8.4
 */
router.delete('/:productId', customerAuth, removeFromWishlistHandler);

export default router;
