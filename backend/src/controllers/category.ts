import { Request, Response, NextFunction } from 'express';
import {
  listCategories,
  addCategory,
  editCategory,
  removeCategory,
} from '../services/category';
import type { ApiResponse } from '../types';

/**
 * GET /api/categories
 *
 * Public endpoint — returns all categories.
 *
 * Validates: Requirement 13 (public list)
 */
export async function listCategoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await listCategories();
    const body: ApiResponse<typeof categories> = { success: true, data: categories };
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/categories
 *
 * Admin only — create a new category.
 *
 * Body: { name: string }
 *
 * Returns 409 for duplicate name, 400 for validation errors.
 *
 * Validates: Requirements 13.1, 13.2
 */
export async function createCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name } = req.body as { name?: string };

    if (!name || typeof name !== 'string' || name.trim() === '') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'name is required', fields: ['name'] },
      };
      res.status(400).json(body);
      return;
    }

    const result = await addCategory({ name });
    const body: ApiResponse<typeof result.category> = { success: true, data: result.category };
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
        error: { message: e.message, fields: ['name'] },
      };
      res.status(400).json(body);
      return;
    }
    next(err);
  }
}

/**
 * PUT /api/categories/:id
 *
 * Admin only — update a category's name.
 *
 * Body: { name: string }
 *
 * Returns 404 if not found, 409 for duplicate name.
 *
 * Validates: Requirement 13.3
 */
export async function updateCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Category not found' },
      };
      res.status(404).json(body);
      return;
    }

    const { name } = req.body as { name?: string };

    if (!name || typeof name !== 'string' || name.trim() === '') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'name is required', fields: ['name'] },
      };
      res.status(400).json(body);
      return;
    }

    const result = await editCategory({ id, name });
    const body: ApiResponse<typeof result.category> = { success: true, data: result.category };
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
        error: { message: e.message, fields: ['name'] },
      };
      res.status(400).json(body);
      return;
    }
    next(err);
  }
}

/**
 * DELETE /api/categories/:id
 *
 * Admin only — delete a category.
 *
 * Returns 404 if not found, 409 if products are assigned.
 *
 * Validates: Requirements 13.4, 13.5
 */
export async function deleteCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: 'Category not found' },
      };
      res.status(404).json(body);
      return;
    }

    await removeCategory(id);
    const body: ApiResponse<{ deleted: boolean }> = { success: true, data: { deleted: true } };
    res.status(200).json(body);
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    if (e.code === 'HAS_PRODUCTS') {
      const body: ApiResponse<never> = {
        success: false,
        error: { message: e.message },
      };
      res.status(409).json(body);
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
