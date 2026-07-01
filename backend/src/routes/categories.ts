import { Router } from 'express';
import { verifyJWT, requireRole } from '../middleware/auth';
import {
  listCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from '../controllers/category';

const router = Router();

const adminAuth = [verifyJWT, requireRole('admin')];

/**
 * GET /api/categories
 *
 * Public — list all categories.
 *
 * Validates: Requirement 13 (public list)
 */
router.get('/', listCategoriesHandler);

/**
 * POST /api/categories
 *
 * Admin only — create a new category.
 * Body: { name: string }
 * Returns 409 for duplicate name.
 *
 * Validates: Requirements 13.1, 13.2
 */
router.post('/', adminAuth, createCategoryHandler);

/**
 * PUT /api/categories/:id
 *
 * Admin only — update a category's name.
 * Body: { name: string }
 * Returns 404 if not found, 409 for duplicate name.
 *
 * Validates: Requirement 13.3
 */
router.put('/:id', adminAuth, updateCategoryHandler);

/**
 * DELETE /api/categories/:id
 *
 * Admin only — delete a category.
 * Returns 404 if not found, 409 if products are assigned.
 *
 * Validates: Requirements 13.4, 13.5
 */
router.delete('/:id', adminAuth, deleteCategoryHandler);

export default router;
