import { Router } from 'express';
import { verifyJWT, requireRole } from '../middleware/auth';
import { createOrderHandler, getOrdersHandler, getOrderHandler, cancelOrderHandler } from '../controllers/order';

const router = Router();

// All order routes require a valid Customer (or Admin) JWT
const customerAuth = [verifyJWT, requireRole('customer', 'admin')];

/**
 * GET /api/orders
 * Paginated order history for the authenticated customer.
 */
router.get('/', customerAuth, getOrdersHandler);

/**
 * GET /api/orders/:id
 * Full order detail (items + address) for the authenticated customer.
 */
router.get('/:id', customerAuth, getOrderHandler);

/**
 * POST /api/orders
 * Checkout: validate cart, apply coupon, create order, decrement stock, clear cart.
 */
router.post('/', customerAuth, createOrderHandler);

/**
 * DELETE /api/orders/:id
 * Cancel a Pending or Confirmed order.
 */
router.delete('/:id', customerAuth, cancelOrderHandler);

export default router;
