import { Router } from 'express';
import {
  listProductsHandler,
  getProductHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
} from '../controllers/product';
import { verifyJWT, requireRole } from '../middleware/auth';

const router = Router();

const adminAuth = [verifyJWT, requireRole('admin')];

/**
 * GET /api/products
 *
 * Public endpoint (optional JWT — admins see inactive products).
 * Supports pagination, search, category filter, price range filter, and sort.
 *
 * Validates: Requirements 5.2, 6.1–6.5
 */
router.get('/', listProductsHandler);

/**
 * GET /api/products/:id
 *
 * Public endpoint (optional JWT — admins see inactive products).
 * Returns full product details with all images and average rating.
 * Returns 404 if product does not exist or is inactive and caller is not admin.
 *
 * Validates: Requirements 5.3, 5.4
 */
router.get('/:id', getProductHandler);

/**
 * POST /api/products
 *
 * Admin only — create a new product.
 * Body: { name, description?, category_id?, price, discount_price?, stock,
 *         status?, is_featured?, images? }
 *
 * Validates: Requirements 12.1, 12.5
 */
router.post('/', adminAuth, createProductHandler);

/**
 * PUT /api/products/:id
 *
 * Admin only — update an existing product (partial update).
 *
 * Validates: Requirements 12.2, 12.3, 12.5
 */
router.put('/:id', adminAuth, updateProductHandler);

/**
 * DELETE /api/products/:id
 *
 * Admin only — delete a product and all associated images.
 *
 * Validates: Requirement 12.4
 */
router.delete('/:id', adminAuth, deleteProductHandler);

export default router;
