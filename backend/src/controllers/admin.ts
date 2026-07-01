import { Request, Response, NextFunction } from 'express';
import {
  getDashboard,
  listAdminOrders,
  updateAdminOrderStatus,
  listAdminUsers,
  updateAdminUser,
  listCoupons,
  addCoupon,
  removeCoupon,
} from '../services/admin';
import type { ApiResponse } from '../types';

// ── Dashboard ─────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard
 *
 * Returns aggregate store statistics and last-30-day daily revenue.
 *
 * Validates: Requirements 17.1, 17.2
 */
export async function getDashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await getDashboard();
    const body: ApiResponse<typeof data> = { success: true, data };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

// ── Orders ────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/orders
 *
 * Paginated list of all orders, optionally filtered by status.
 *
 * Query params: page, pageSize, status
 *
 * Validates: Requirement 14.1
 */
export async function listAdminOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listAdminOrders({
      page: req.query.page as string | undefined,
      pageSize: req.query.pageSize as string | undefined,
      status: req.query.status as string | undefined,
    });

    const body: ApiResponse<typeof result.orders> = {
      success: true,
      data: result.orders,
      pagination: result.pagination,
    };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/orders/:id
 *
 * Update the status of an order.
 *
 * Body: { status: string }
 *
 * Returns 400 for invalid status, 404 if order not found.
 *
 * Validates: Requirements 14.2, 14.3
 */
export async function updateAdminOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Order not found' },
      };
      res.status(404).json(body);
      return;
    }

    const { status } = req.body as { status?: string };
    if (!status || typeof status !== 'string') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'status is required', fields: ['status'] },
      };
      res.status(400).json(body);
      return;
    }

    const result = await updateAdminOrderStatus({ orderId, status });
    const body: ApiResponse<typeof result.order> = { success: true, data: result.order };
    res.status(200).json(body);
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    if (e.code === 'INVALID_STATUS') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: e.message, fields: ['status'] },
      };
      res.status(400).json(body);
      return;
    }
    if (e.code === 'NOT_FOUND') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: e.message },
      };
      res.status(404).json(body);
      return;
    }
    next(err);
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 *
 * Paginated list of all users.
 *
 * Query params: page, pageSize
 *
 * Validates: Requirement 15.1
 */
export async function listAdminUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listAdminUsers({
      page: req.query.page as string | undefined,
      pageSize: req.query.pageSize as string | undefined,
    });

    const body: ApiResponse<typeof result.users> = {
      success: true,
      data: result.users,
      pagination: result.pagination,
    };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/users/:id
 *
 * Update a user's role and/or is_active flag.
 *
 * Body: { role?: string, is_active?: boolean }
 *
 * Returns 400 for invalid role, 404 if user not found.
 *
 * Validates: Requirements 15.2, 15.3
 */
export async function updateAdminUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!Number.isFinite(userId) || userId <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'User not found' },
      };
      res.status(404).json(body);
      return;
    }

    const { role, is_active } = req.body as { role?: string; is_active?: boolean };

    const result = await updateAdminUser({ userId, role, is_active });
    const body: ApiResponse<typeof result.user> = { success: true, data: result.user };
    res.status(200).json(body);
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    if (e.code === 'INVALID_ROLE') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: e.message, fields: ['role'] },
      };
      res.status(400).json(body);
      return;
    }
    if (e.code === 'NOT_FOUND') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: e.message },
      };
      res.status(404).json(body);
      return;
    }
    next(err);
  }
}

// ── Coupons ───────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/coupons
 *
 * List all coupons.
 *
 * Validates: Requirement 16.4
 */
export async function listCouponsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const coupons = await listCoupons();
    const body: ApiResponse<typeof coupons> = { success: true, data: coupons };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/coupons
 *
 * Create a new coupon.
 *
 * Body: { code, discount_type, discount_value, expires_at }
 *
 * Returns 409 for duplicate code, 400 for validation errors.
 *
 * Validates: Requirements 16.1, 16.2
 */
export async function createCouponHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code, discount_type, discount_value, expires_at } =
      req.body as {
        code?: string;
        discount_type?: string;
        discount_value?: number;
        expires_at?: string;
      };

    const errors: string[] = [];
    if (!code || typeof code !== 'string' || code.trim() === '') {
      errors.push('code');
    }
    if (!discount_type) errors.push('discount_type');
    if (discount_value === undefined || discount_value === null) errors.push('discount_value');
    if (typeof discount_value === 'number' && discount_value <= 0) errors.push('discount_value');
    if (!expires_at) errors.push('expires_at');

    if (errors.length > 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Missing or invalid required fields', fields: errors },
      };
      res.status(400).json(body);
      return;
    }

    const result = await addCoupon({
      code: (code as string).trim().toUpperCase(),
      discount_type: discount_type as string,
      discount_value: discount_value as number,
      expires_at: expires_at as string,
    });

    const body: ApiResponse<typeof result.coupon> = { success: true, data: result.coupon };
    res.status(201).json(body);
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    if (e.code === 'DUPLICATE') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: e.message },
      };
      res.status(409).json(body);
      return;
    }
    if (e.code === 'VALIDATION') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: e.message },
      };
      res.status(400).json(body);
      return;
    }
    next(err);
  }
}

/**
 * DELETE /api/admin/coupons/:id
 *
 * Delete a coupon by ID.
 *
 * Returns 404 if not found.
 *
 * Validates: Requirement 16.3
 */
export async function deleteCouponHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const couponId = parseInt(req.params.id, 10);
    if (!Number.isFinite(couponId) || couponId <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Coupon not found' },
      };
      res.status(404).json(body);
      return;
    }

    await removeCoupon(couponId);
    const body: ApiResponse<{ deleted: boolean }> = { success: true, data: { deleted: true } };
    res.status(200).json(body);
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: e.message },
      };
      res.status(404).json(body);
      return;
    }
    next(err);
  }
}
