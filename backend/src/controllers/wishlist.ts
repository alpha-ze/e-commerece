import { Request, Response, NextFunction } from 'express';
import {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
} from '../services/wishlist';
import type { ApiResponse } from '../types';
import type { WishlistItemResult } from '../services/wishlist';

// ── Helper ────────────────────────────────────────────────────────────────────

function isCodedError(err: unknown): err is Error & { code: string } {
  return err instanceof Error && typeof (err as { code?: string }).code === 'string';
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * GET /api/wishlist
 *
 * Returns the authenticated customer's wishlist. Each item includes
 * product_name, primary_image, price, and discount_price.
 *
 * Response shape:
 *   200  { success: true, data: [...] }
 *
 * Validates: Requirement 8.1
 */
export async function getWishlistHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const items = await getWishlist(userId);

    const body: ApiResponse<WishlistItemResult[]> = { success: true, data: items };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/wishlist
 *
 * Adds a product to the wishlist.
 *
 * Body: { product_id: number }
 *
 * Response shape:
 *   201  { success: true, data: [...] }
 *   400  { success: false, error: { message: "..." } }
 *   404  { success: false, error: { message: "Product not found" } }
 *   409  { success: false, error: { message: "Product is already in your wishlist" } }
 *
 * Validates: Requirements 8.2, 8.3
 */
export async function addToWishlistHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const productId = parseInt(String(req.body.product_id), 10);

    if (!Number.isFinite(productId) || productId <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'product_id must be a positive integer' },
      };
      res.status(400).json(body);
      return;
    }

    const items = await addWishlistItem({ userId, productId });

    const body: ApiResponse<WishlistItemResult[]> = { success: true, data: items };
    res.status(201).json(body);
  } catch (err) {
    if (isCodedError(err)) {
      if (err.code === 'DUPLICATE') {
        const body: ApiResponse<never> = {
          success: false,
          error: { message: err.message },
        };
        res.status(409).json(body);
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
 * DELETE /api/wishlist/:productId
 *
 * Removes a product from the wishlist. Returns the updated wishlist.
 *
 * Response shape:
 *   200  { success: true, data: [...] }
 *   404  { success: false, error: { message: "Wishlist item not found" } }
 *
 * Validates: Requirement 8.4
 */
export async function removeFromWishlistHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const productId = parseInt(req.params.productId, 10);

    if (!Number.isFinite(productId) || productId <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Wishlist item not found' },
      };
      res.status(404).json(body);
      return;
    }

    const items = await removeWishlistItem({ userId, productId });

    const body: ApiResponse<WishlistItemResult[]> = { success: true, data: items };
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
