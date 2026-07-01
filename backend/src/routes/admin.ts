import { Router } from 'express';
import { verifyJWT, requireRole } from '../middleware/auth';
import {
  getDashboardHandler,
  listAdminOrdersHandler,
  updateAdminOrderHandler,
  listAdminUsersHandler,
  updateAdminUserHandler,
  listCouponsHandler,
  createCouponHandler,
  deleteCouponHandler,
} from '../controllers/admin';

const router = Router();

// All admin routes require a valid Admin JWT
const adminAuth = [verifyJWT, requireRole('admin')];

// ── Dashboard ─────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard
 *
 * Returns aggregate store statistics (total orders, customers, revenue)
 * and last-30-day daily revenue breakdown.
 *
 * Validates: Requirements 17.1, 17.2
 */
router.get('/dashboard', adminAuth, getDashboardHandler);

// ── Orders ────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/orders
 *
 * Paginated list of all orders, optionally filtered by status.
 * Query params: page, pageSize, status
 *
 * Validates: Requirement 14.1
 */
router.get('/orders', adminAuth, listAdminOrdersHandler);

/**
 * PUT /api/admin/orders/:id
 *
 * Update an order's status.
 * Body: { status: string }
 * Returns 400 for invalid status, 404 if order not found.
 *
 * Validates: Requirements 14.2, 14.3
 */
router.put('/orders/:id', adminAuth, updateAdminOrderHandler);

// ── Users ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 *
 * Paginated list of all users.
 * Query params: page, pageSize
 *
 * Validates: Requirement 15.1
 */
router.get('/users', adminAuth, listAdminUsersHandler);

/**
 * PUT /api/admin/users/:id
 *
 * Update a user's role and/or is_active flag.
 * Body: { role?: string, is_active?: boolean }
 *
 * Validates: Requirements 15.2, 15.3
 */
router.put('/users/:id', adminAuth, updateAdminUserHandler);

// ── Coupons ───────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/coupons
 *
 * List all coupons.
 *
 * Validates: Requirement 16.4
 */
router.get('/coupons', adminAuth, listCouponsHandler);

/**
 * POST /api/admin/coupons
 *
 * Create a new coupon.
 * Body: { code, discount_type, discount_value, expires_at }
 * Returns 409 for duplicate code.
 *
 * Validates: Requirements 16.1, 16.2
 */
router.post('/coupons', adminAuth, createCouponHandler);

/**
 * DELETE /api/admin/coupons/:id
 *
 * Delete a coupon by ID.
 *
 * Validates: Requirement 16.3
 */
router.delete('/coupons/:id', adminAuth, deleteCouponHandler);

export default router;
