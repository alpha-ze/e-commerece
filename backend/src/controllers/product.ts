import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  listProducts,
  getProduct,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
} from '../services/product';
import type { ApiResponse } from '../types';
import type { JwtPayload } from '../types';
import type { ProductListItem, ProductDetail } from '../models/product';

/**
 * Attempt to decode an optional Bearer JWT from the Authorization header
 * without enforcing validity on the route (no 401 on missing/invalid token).
 *
 * This is used by public routes that behave differently for admins
 * (e.g., showing inactive products).  If the token is present and valid the
 * decoded payload is attached to `req.user`; otherwise the request proceeds
 * unauthenticated.
 */
function tryAttachUser(req: Request): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return;

  const token = authHeader.slice(7);
  if (!token) return;

  try {
    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
  } catch {
    // Invalid / expired token — treated as unauthenticated
  }
}

/**
 * GET /api/products
 *
 * Returns a paginated, filtered, sorted list of products.
 *
 * Query parameters:
 *   page       – 1-based page number (default 1)
 *   pageSize   – items per page (default 20, max 100)
 *   q          – case-insensitive search on name or description
 *   categoryId – integer category filter
 *   minPrice   – minimum effective price filter
 *   maxPrice   – maximum effective price filter
 *   sort       – price_asc | price_desc | newest | popularity
 *
 * Non-admin callers only see 'active' products.
 * Admin JWT callers see all products (including inactive).
 *
 * Validates: Requirements 5.2, 6.1–6.5, 12.3
 */
export async function listProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Optionally attach user for role check (does not reject on missing token)
    tryAttachUser(req);

    const isAdmin = req.user?.role === 'admin';

    const result = await listProducts({
      page: req.query.page as string | undefined,
      pageSize: req.query.pageSize as string | undefined,
      q: req.query.q as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
      minPrice: req.query.minPrice as string | undefined,
      maxPrice: req.query.maxPrice as string | undefined,
      sort: req.query.sort as string | undefined,
      isAdmin,
    });

    const body: ApiResponse<ProductListItem[]> = {
      success: true,
      data: result.products,
      pagination: result.pagination,
    };

    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/:id
 *
 * Returns full product details including all images and average rating.
 *
 * - Inactive products are hidden from non-admin callers (404 returned).
 * - Admin callers (valid admin JWT) can see inactive products.
 * - No 401 is returned for missing/invalid tokens — the route is public but
 *   optionally admin-aware via tryAttachUser.
 *
 * Response shape:
 *   200  { success: true,  data: { product } }
 *   404  { success: false, error: { message: "Product not found" } }
 *
 * Validates: Requirements 5.3, 5.4
 */
export async function getProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Optionally attach user for role check (does not reject on missing token)
    tryAttachUser(req);

    const id = parseInt(req.params.id, 10);

    if (!Number.isFinite(id) || id <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Product not found' },
      };
      res.status(404).json(body);
      return;
    }

    const isAdmin = req.user?.role === 'admin';

    const result = await getProduct({ id, isAdmin });

    const body: ApiResponse<{ product: ProductDetail }> = {
      success: true,
      data: { product: result.product },
    };

    res.status(200).json(body);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err as Error & { code?: string }).code === 'NOT_FOUND'
    ) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Product not found' },
      };
      res.status(404).json(body);
      return;
    }
    next(err);
  }
}

// ── Admin CRUD handlers ───────────────────────────────────────────────────────

/**
 * POST /api/products
 *
 * Admin only — create a new product.
 *
 * Body: { name, description?, category_id?, price, discount_price?, stock,
 *         status?, is_featured?, images? }
 *
 * Returns 400 if price < 0 or stock < 0 (Req 12.5).
 *
 * Validates: Requirements 12.1, 12.5
 */
export async function createProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await adminCreateProduct(req.body);
    const body: ApiResponse<{ product: ProductDetail }> = {
      success: true,
      data: { product: result.product },
    };
    res.status(201).json(body);
  } catch (err: unknown) {
    const e = err as Error & { code?: string; fields?: string[] };
    if (e.code === 'VALIDATION') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: e.message, fields: e.fields },
      };
      res.status(400).json(body);
      return;
    }
    next(err);
  }
}

/**
 * PUT /api/products/:id
 *
 * Admin only — update an existing product (partial update).
 *
 * Returns 400 if price < 0 or stock < 0, 404 if not found.
 *
 * Validates: Requirements 12.2, 12.3, 12.5
 */
export async function updateProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Product not found' },
      };
      res.status(404).json(body);
      return;
    }

    const result = await adminUpdateProduct({ id, ...req.body });
    const body: ApiResponse<{ product: ProductDetail }> = {
      success: true,
      data: { product: result.product },
    };
    res.status(200).json(body);
  } catch (err: unknown) {
    const e = err as Error & { code?: string; fields?: string[] };
    if (e.code === 'VALIDATION') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: e.message, fields: e.fields },
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

/**
 * DELETE /api/products/:id
 *
 * Admin only — delete a product and all associated images.
 *
 * Returns 404 if not found.
 *
 * Validates: Requirement 12.4
 */
export async function deleteProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Product not found' },
      };
      res.status(404).json(body);
      return;
    }

    await adminDeleteProduct(id);
    const body: ApiResponse<{ deleted: boolean }> = {
      success: true,
      data: { deleted: true },
    };
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
