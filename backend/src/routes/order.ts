import { Router } from 'express';
import { verifyJWT, requireRole } from '../middleware/auth';
import { createOrderHandler, getOrdersHandler, getOrderHandler } from '../controllers/order';

const router = Router();

// All order routes require a valid Customer (or Admin) JWT
const customerAuth = [verifyJWT, requireRole('customer', 'admin')];

/**
 * GET /api/orders
 *
 * Paginated order history for the authenticated customer.
 *
 * Query params: page (default 1), pageSize (default 10)
 *
 * Validates: Requirement 11.1
 */
router.get('/', customerAuth, getOrdersHandler);

/**
 * GET /api/orders/:id
 *
 * Full order detail (items + address) for the authenticated customer.
 * Returns 404 if not found, 403 if order belongs to a different user.
 *
 * Validates: Requirements 11.2, 11.4
 */
router.get('/:id', customerAuth, getOrderHandler);

/**
 * POST /api/orders
 *
 * Checkout: validate cart, apply coupon, create order, decrement stock, clear cart.
 *
 * Body: { address_id, payment_method?, coupon_code? }
 *
 * Validates: Requirements 10.1–10.7
 */
router.post('/', customerAuth, createOrderHandler);

export default router;
