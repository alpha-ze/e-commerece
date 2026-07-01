import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  type GetProductsOptions,
  type ProductListItem,
  type ProductDetail,
  type SortOption,
  type CreateProductParams,
  type UpdateProductParams,
} from '../models/product';
import type { PaginationMeta } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const VALID_SORT_OPTIONS = new Set<string>([
  'price_asc',
  'price_desc',
  'newest',
  'popularity',
]);

// ── Input shape from query params ─────────────────────────────────────────────

export interface ListProductsInput {
  page?: string | number;
  pageSize?: string | number;
  q?: string;
  categoryId?: string | number;
  minPrice?: string | number;
  maxPrice?: string | number;
  sort?: string;
  isAdmin?: boolean;
}

// ── Result shape ──────────────────────────────────────────────────────────────

export interface ListProductsResult {
  products: ProductListItem[];
  pagination: PaginationMeta;
}

// ── Service function ──────────────────────────────────────────────────────────

/**
 * List products with pagination, search, category filter, price range filter,
 * and sort.  Validates and normalises raw query-string inputs before passing
 * them to the model layer.
 *
 * Validates: Requirements 5.2, 6.1–6.5
 */
export async function listProducts(
  input: ListProductsInput,
): Promise<ListProductsResult> {
  // ── Pagination ─────────────────────────────────────────────────────────────
  const page = Math.max(1, parseInt(String(input.page ?? DEFAULT_PAGE), 10) || DEFAULT_PAGE);
  const rawPageSize = parseInt(String(input.pageSize ?? DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(1, rawPageSize), MAX_PAGE_SIZE);

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sort: SortOption | undefined =
    input.sort && VALID_SORT_OPTIONS.has(input.sort)
      ? (input.sort as SortOption)
      : undefined;

  // ── Numeric filters ────────────────────────────────────────────────────────
  const categoryId =
    input.categoryId !== undefined && input.categoryId !== ''
      ? parseInt(String(input.categoryId), 10) || undefined
      : undefined;

  const minPrice =
    input.minPrice !== undefined && input.minPrice !== ''
      ? parseFloat(String(input.minPrice))
      : undefined;

  const maxPrice =
    input.maxPrice !== undefined && input.maxPrice !== ''
      ? parseFloat(String(input.maxPrice))
      : undefined;

  // ── Build model options ────────────────────────────────────────────────────
  const opts: GetProductsOptions = {
    page,
    pageSize,
    q: input.q,
    categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    sort,
    includeInactive: input.isAdmin === true,
  };

  const { rows, total } = await getProducts(opts);

  return {
    products: rows,
    pagination: { page, pageSize, total },
  };
}

// ── Get single product ────────────────────────────────────────────────────────

export interface GetProductInput {
  id: number;
  /** When true, inactive products are returned (admin view). */
  isAdmin?: boolean;
}

export interface GetProductResult {
  product: ProductDetail;
}

/**
 * Fetch a single product by ID.
 *
 * Enforces visibility rule: inactive products are returned only to admins.
 * Throws with code 'NOT_FOUND' when the product doesn't exist or when a
 * non-admin requests an inactive product (Validates: Requirements 5.3, 5.4).
 */
export async function getProduct(
  input: GetProductInput,
): Promise<GetProductResult> {
  const product = await getProductById(input.id);

  if (product === null) {
    const err = new Error('Product not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Hide inactive products from non-admin callers (requirement 5.4)
  if (product.status === 'inactive' && !input.isAdmin) {
    const err = new Error('Product not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }

  return { product };
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

export interface CreateProductInput {
  name: string;
  description?: string;
  category_id?: number;
  price: number;
  discount_price?: number;
  stock: number;
  status?: 'active' | 'inactive';
  is_featured?: boolean;
  images?: Array<{ url: string; is_primary?: boolean; sort_order?: number }>;
}

export interface CreateProductResult {
  product: ProductDetail;
}

/**
 * Create a new product (Admin only).
 *
 * Throws with code 'VALIDATION' if price < 0 or stock < 0.
 *
 * Validates: Requirements 12.1, 12.5
 */
export async function adminCreateProduct(
  input: CreateProductInput,
): Promise<CreateProductResult> {
  const errors: string[] = [];

  if (!input.name || input.name.trim() === '') {
    errors.push('name is required');
  }
  if (input.price === undefined || input.price === null) {
    errors.push('price is required');
  } else if (input.price < 0) {
    errors.push('price must be >= 0');
  }
  if (input.stock === undefined || input.stock === null) {
    errors.push('stock is required');
  } else if (input.stock < 0) {
    errors.push('stock must be >= 0');
  }

  if (errors.length > 0) {
    const err = new Error('Validation failed') as Error & { code: string; fields: string[] };
    err.code = 'VALIDATION';
    err.fields = errors;
    throw err;
  }

  const params: CreateProductParams = {
    name: input.name.trim(),
    description: input.description,
    category_id: input.category_id,
    price: input.price,
    discount_price: input.discount_price,
    stock: input.stock,
    status: input.status ?? 'active',
    is_featured: input.is_featured ?? false,
    images: input.images,
  };

  const product = await createProduct(params);
  return { product };
}

export interface UpdateProductInput {
  id: number;
  name?: string;
  description?: string;
  category_id?: number | null;
  price?: number;
  discount_price?: number | null;
  stock?: number;
  status?: 'active' | 'inactive';
  is_featured?: boolean;
}

export interface UpdateProductResult {
  product: ProductDetail;
}

/**
 * Update an existing product (Admin only).
 *
 * Throws with code 'VALIDATION' if price < 0 or stock < 0.
 * Throws with code 'NOT_FOUND' if no product with that ID exists.
 *
 * Validates: Requirements 12.2, 12.3, 12.5
 */
export async function adminUpdateProduct(
  input: UpdateProductInput,
): Promise<UpdateProductResult> {
  const errors: string[] = [];

  if (input.price !== undefined && input.price < 0) {
    errors.push('price must be >= 0');
  }
  if (input.stock !== undefined && input.stock < 0) {
    errors.push('stock must be >= 0');
  }

  if (errors.length > 0) {
    const err = new Error('Validation failed') as Error & { code: string; fields: string[] };
    err.code = 'VALIDATION';
    err.fields = errors;
    throw err;
  }

  const params: UpdateProductParams = {};
  if (input.name !== undefined) params.name = input.name;
  if (input.description !== undefined) params.description = input.description;
  if (input.category_id !== undefined) params.category_id = input.category_id;
  if (input.price !== undefined) params.price = input.price;
  if (input.discount_price !== undefined) params.discount_price = input.discount_price;
  if (input.stock !== undefined) params.stock = input.stock;
  if (input.status !== undefined) params.status = input.status;
  if (input.is_featured !== undefined) params.is_featured = input.is_featured;

  const product = await updateProduct(input.id, params);

  if (!product) {
    const err = new Error('Product not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }

  return { product };
}

export interface DeleteProductResult {
  deleted: boolean;
}

/**
 * Delete a product (Admin only).
 *
 * Throws with code 'NOT_FOUND' if no product with that ID exists.
 *
 * Validates: Requirements 12.4
 */
export async function adminDeleteProduct(id: number): Promise<DeleteProductResult> {
  const deleted = await deleteProduct(id);

  if (!deleted) {
    const err = new Error('Product not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }

  return { deleted: true };
}
