import { Router } from 'express';
import { verifyJWT, requireRole } from '../middleware/auth';
import {
  getCartHandler,
  addToCartHandler,
  updateCartItemHandler,
  removeCartItemHandler,
} from '../controllers/cart';

const router = Router();

// All cart routes require a valid Customer (or Admin) JWT
const customerAuth = [verifyJWT, requireRole('customer', 'admin')];

/**
 * GET /api/cart
 *
 * Returns the authenticated customer's cart with totals.
 *
 * Validates: Requirements 7.1, 7.6
 */
router.get('/', customerAuth, getCartHandler);

/**
 * POST /api/cart
 *
 * Adds a product to the cart (or increments quantity if already present).
 * Returns 400 if the product's stock is 0.
 *
 * Validates: Requirements 7.2, 7.3
 */
router.post('/', customerAuth, addToCartHandler);

/**
 * PUT /api/cart/:itemId
 *
 * Updates the quantity of a cart item.
 * quantity > 0 → update; quantity = 0 → remove item.
 *
 * Validates: Requirements 7.4, 7.5
 */
router.put('/:itemId', customerAuth, updateCartItemHandler);

/**
 * DELETE /api/cart/:itemId
 *
 * Removes an item from the cart.
 *
 * Validates: Requirement 7.5
 */
router.delete('/:itemId', customerAuth, removeCartItemHandler);

export default router;
