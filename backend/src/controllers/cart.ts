import { Request, Response, NextFunction } from 'express';
import {
  getCart,
  addItem,
  updateItem,
  removeItem,
} from '../services/cart';
import type { ApiResponse } from '../types';
import type { CartResult } from '../services/cart';

// ── Helper ────────────────────────────────────────────────────────────────────

function isCodedError(err: unknown): err is Error & { code: string } {
  return err instanceof Error && typeof (err as { code?: string }).code === 'string';
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * GET /api/cart
 *
 * Returns the authenticated customer's cart with totals.
 *
 * Response shape:
 *   200  { success: true, data: { items: [...], subtotal, tax, total } }
 *
 * Validates: Requirement 7.1
 */
export async function getCartHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const cart = await getCart(userId);

    const body: ApiResponse<CartResult> = { success: true, data: cart };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cart
 *
 * Adds a product to the cart (or increments quantity if already present).
 *
 * Body: { product_id: number, quantity?: number }
 *
 * Response shape:
 *   201  { success: true, data: { items: [...], subtotal, tax, total } }
 *   400  { success: false, error: { message: "Product is out of stock" } }
 *   404  { success: false, error: { message: "Product not found" } }
 *
 * Validates: Requirements 7.2, 7.3
 */
export async function addToCartHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const productId = parseInt(String(req.body.product_id), 10);
    const quantity = req.body.quantity !== undefined
      ? parseInt(String(req.body.quantity), 10)
      : 1;

    if (!Number.isFinite(productId) || productId <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'product_id must be a positive integer' },
      };
      res.status(400).json(body);
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'quantity must be a positive integer' },
      };
      res.status(400).json(body);
      return;
    }

    const cart = await addItem({ userId, productId, quantity });

    const body: ApiResponse<CartResult> = { success: true, data: cart };
    res.status(201).json(body);
  } catch (err) {
    if (isCodedError(err)) {
      if (err.code === 'OUT_OF_STOCK') {
        const body: ApiResponse<never> = {
          success: false,
          error: { message: err.message },
        };
        res.status(400).json(body);
        return;
      }
      if (err.code === 'NOT_FOUND') {
        const body: ApiResponse<never> = {
          success: false,
          error: { message: err.message },
        };
        res.status(404).json(body);
        return;
      }
    }
    next(err);
  }
}

/**
 * PUT /api/cart/:itemId
 *
 * Updates the quantity of a cart item.
 * - quantity > 0 → update quantity
 * - quantity = 0 → remove item
 *
 * Body: { quantity: number }
 *
 * Response shape:
 *   200  { success: true, data: { items: [...], subtotal, tax, total } }
 *   400  { success: false, error: { message: "..." } }
 *   404  { success: false, error: { message: "Cart item not found" } }
 *
 * Validates: Requirements 7.4, 7.5
 */
export async function updateCartItemHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const cartItemId = parseInt(req.params.itemId, 10);
    const quantity = parseInt(String(req.body.quantity), 10);

    if (!Number.isFinite(cartItemId) || cartItemId <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Cart item not found' },
      };
      res.status(404).json(body);
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'quantity must be a non-negative integer' },
      };
      res.status(400).json(body);
      return;
    }

    const cart = await updateItem({ userId, cartItemId, quantity });

    const body: ApiResponse<CartResult> = { success: true, data: cart };
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
 * DELETE /api/cart/:itemId
 *
 * Removes an item from the cart.
 *
 * Response shape:
 *   200  { success: true, data: { items: [...], subtotal, tax, total } }
 *   404  { success: false, error: { message: "Cart item not found" } }
 *
 * Validates: Requirement 7.5
 */
export async function removeCartItemHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const cartItemId = parseInt(req.params.itemId, 10);

    if (!Number.isFinite(cartItemId) || cartItemId <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Cart item not found' },
      };
      res.status(404).json(body);
      return;
    }

    const cart = await removeItem({ userId, cartItemId });

    const body: ApiResponse<CartResult> = { success: true, data: cart };
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
