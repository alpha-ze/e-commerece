import { Request, Response, NextFunction } from 'express';
import { checkout, getOrderHistory, getOrderDetail, cancelOrder, returnOrder } from '../services/order';
import type { ApiResponse } from '../types';
import type { OrderResult, OrderHistoryResult, OrderDetailResult } from '../services/order';

// ── Helper ────────────────────────────────────────────────────────────────────

function isCodedError(err: unknown): err is Error & { code: string } {
  return err instanceof Error && typeof (err as { code?: string }).code === 'string';
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/orders
 *
 * Performs checkout for the authenticated customer:
 *  1. Validates cart is non-empty
 *  2. Validates address_id belongs to the user
 *  3. Validates coupon_code if provided
 *  4. Calculates totals (subtotal, tax, discount, total)
 *  5. Creates order + order_items, decrements stock, and clears cart — atomically
 *
 * Body:
 *   {
 *     address_id:     number   (required)
 *     payment_method: string   (optional, default: "Cash on Delivery")
 *     coupon_code:    string   (optional)
 *   }
 *
 * Response shape:
 *   201  { success: true,  data: { id, user_id, address_id, status, payment_method,
 *                                  subtotal, tax, discount, total, coupon_id,
 *                                  created_at, updated_at, items: [...] } }
 *   400  { success: false, error: { message: "..." } }
 *
 * Validates: Requirements 10.1–10.7
 */
export async function createOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;

    // ── Validate request body ────────────────────────────────────────────────
    const addressId = parseInt(String(req.body.address_id), 10);
    if (!Number.isFinite(addressId) || addressId <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'address_id must be a positive integer' },
      };
      res.status(400).json(body);
      return;
    }

    const paymentMethod: string =
      typeof req.body.payment_method === 'string' && req.body.payment_method.trim()
        ? req.body.payment_method.trim()
        : 'Cash on Delivery';

    const couponCode: string | undefined =
      typeof req.body.coupon_code === 'string' && req.body.coupon_code.trim()
        ? req.body.coupon_code.trim()
        : undefined;

    // ── Delegate to service ──────────────────────────────────────────────────
    const order = await checkout({ userId, addressId, paymentMethod, couponCode });

    const body: ApiResponse<OrderResult> = { success: true, data: order };
    res.status(201).json(body);
  } catch (err) {
    if (isCodedError(err)) {
      if (err.code === 'EMPTY_CART') {
        const body: ApiResponse<never> = {
          success: false,
          error: { message: err.message },
        };
        res.status(400).json(body);
        return;
      }

      if (err.code === 'INVALID_ADDRESS') {
        const body: ApiResponse<never> = {
          success: false,
          error: { message: err.message },
        };
        res.status(400).json(body);
        return;
      }

      if (err.code === 'INVALID_COUPON') {
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

/**
 * GET /api/orders
 *
 * Returns a paginated list of orders for the authenticated customer,
 * ordered by created_at DESC.
 *
 * Query params:
 *   page     (optional, default 1)
 *   pageSize (optional, default 10)
 *
 * Response shape:
 *   200  { success: true, data: [...], pagination: { page, pageSize, total } }
 *
 * Validates: Requirement 11.1
 */
export async function getOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;

    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(
      1,
      Math.min(100, parseInt(String(req.query.pageSize ?? '10'), 10) || 10),
    );

    const result = await getOrderHistory(userId, page, pageSize);

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
 * GET /api/orders/:id
 *
 * Returns the full detail of a single order for the authenticated customer.
 *
 * Responds 404 if the order does not exist.
 * Responds 403 if the order belongs to a different user (Requirement 11.4).
 *
 * Response shape:
 *   200  { success: true, data: { ...order, items: [...], address: {...} } }
 *   403  { success: false, error: { message: "..." } }
 *   404  { success: false, error: { message: "..." } }
 *
 * Validates: Requirements 11.2, 11.4
 */
export async function getOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.id, 10);

    if (!Number.isFinite(orderId) || orderId <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Order ID must be a positive integer' },
      };
      res.status(400).json(body);
      return;
    }

    const order = await getOrderDetail(orderId, userId);

    const body: ApiResponse<OrderDetailResult> = { success: true, data: order };
    res.status(200).json(body);
  } catch (err) {
    if (isCodedError(err)) {
      if (err.code === 'ORDER_NOT_FOUND') {
        const body: ApiResponse<never> = {
          success: false,
          error: { message: err.message },
        };
        res.status(404).json(body);
        return;
      }

      if (err.code === 'ORDER_FORBIDDEN') {
        const body: ApiResponse<never> = {
          success: false,
          error: { message: err.message },
        };
        res.status(403).json(body);
        return;
      }
    }
    next(err);
  }
}

/**
 * DELETE /api/orders/:id
 * Cancel a Pending or Confirmed order.
 */
export async function cancelOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.id, 10);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Order ID must be a positive integer' } });
      return;
    }
    const order = await cancelOrder(orderId, userId);
    res.status(200).json({ success: true, data: order } as ApiResponse<OrderDetailResult>);
  } catch (err) {
    if (isCodedError(err)) {
      if (err.code === 'ORDER_NOT_FOUND') { res.status(404).json({ success: false, error: { message: err.message } }); return; }
      if (err.code === 'ORDER_FORBIDDEN') { res.status(403).json({ success: false, error: { message: err.message } }); return; }
      if (err.code === 'CANNOT_CANCEL')   { res.status(400).json({ success: false, error: { message: err.message } }); return; }
    }
    next(err);
  }
}

/**
 * POST /api/orders/:id/return
 * Request a return on a Delivered order.
 */
export async function returnOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.id, 10);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      res.status(400).json({ success: false, error: { message: 'Order ID must be a positive integer' } });
      return;
    }
    const order = await returnOrder(orderId, userId);
    res.status(200).json({ success: true, data: order } as ApiResponse<OrderDetailResult>);
  } catch (err) {
    if (isCodedError(err)) {
      if (err.code === 'ORDER_NOT_FOUND') { res.status(404).json({ success: false, error: { message: err.message } }); return; }
      if (err.code === 'ORDER_FORBIDDEN') { res.status(403).json({ success: false, error: { message: err.message } }); return; }
      if (err.code === 'CANNOT_RETURN')   { res.status(400).json({ success: false, error: { message: err.message } }); return; }
    }
    next(err);
  }
}
