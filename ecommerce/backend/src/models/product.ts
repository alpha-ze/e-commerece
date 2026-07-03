import pool from '../db';

// ── Row types ─────────────────────────────────────────────────────────────────

/** Shape returned by getProductById — includes all images and avg rating */
export interface ProductImage {
  id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductDetail {
  id: number;
  sku: string | null;
  name: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  price: string;
  discount_price: string | null;
  stock: number;
  status: 'active' | 'inactive';
  is_featured: boolean;
  images: ProductImage[];
  avg_rating: string | null;
  created_at: Date;
}

export interface ProductRow {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  price: string; // NUMERIC comes back as string from pg
  discount_price: string | null;
  stock: number;
  status: 'active' | 'inactive';
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}

/** Shape returned by getProducts — includes joined fields */
export interface ProductListItem {
  id: number;
  sku: string | null;
  name: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  price: string;
  discount_price: string | null;
  stock: number;
  status: 'active' | 'inactive';
  is_featured: boolean;
  primary_image_url: string | null;
  avg_rating: string | null; // AVG returns numeric string; callers can parse
  created_at: Date;
}

// ── Filter / sort options ─────────────────────────────────────────────────────

export type SortOption = 'price_asc' | 'price_desc' | 'newest' | 'popularity';

export interface GetProductsOptions {
  /** 1-based page number (default 1) */
  page: number;
  /** Number of items per page (default 20, max 100) */
  pageSize: number;
  /** Case-insensitive full-text search on name or description */
  q?: string;
  /** Filter by exact SKU (admin use) */
  sku?: string;
  /** Filter to a single category */
  categoryId?: number;
  /** Minimum effective price (COALESCE(discount_price, price)) */
  minPrice?: number;
  /** Maximum effective price */
  maxPrice?: number;
  /** Sort order */
  sort?: SortOption;
  /**
   * When true, inactive products are included (admin view).
   * When false/undefined, only 'active' products are returned.
   */
  includeInactive?: boolean;
}

// ── Query builder ─────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filtered, sorted list of products with joined
 * category name, primary image URL, and average review rating.
 *
 * Uses dynamic parameterized SQL — conditions are appended to a WHERE clause
 * and corresponding values are pushed to a `params` array to prevent SQL
 * injection (Validates: Requirement 18.4).
 */
export async function getProducts(
  opts: GetProductsOptions,
): Promise<{ rows: ProductListItem[]; total: number }> {
  const {
    page,
    pageSize,
    q,
    sku,
    categoryId,
    minPrice,
    maxPrice,
    sort = 'newest',
    includeInactive = false,
  } = opts;

  const params: unknown[] = [];
  const conditions: string[] = [];

  // ── Status filter ──────────────────────────────────────────────────────────
  if (!includeInactive) {
    conditions.push(`p.status = 'active'`);
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  if (q && q.trim() !== '') {
    params.push(`%${q.trim()}%`);
    const idx = params.length;
    conditions.push(
      `(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`,
    );
  }

  // ── SKU filter (exact match, admin use) ────────────────────────────────────
  if (sku && sku.trim() !== '') {
    params.push(sku.trim().toUpperCase());
    conditions.push(`UPPER(p.sku) = $${params.length}`);
  }

  // ── Category filter ────────────────────────────────────────────────────────
  if (categoryId !== undefined) {
    params.push(categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }

  // ── Price range filter (effective price = COALESCE(discount_price, price)) ─
  if (minPrice !== undefined) {
    params.push(minPrice);
    conditions.push(`COALESCE(p.discount_price, p.price) >= $${params.length}`);
  }

  if (maxPrice !== undefined) {
    params.push(maxPrice);
    conditions.push(`COALESCE(p.discount_price, p.price) <= $${params.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // ── Sort order ─────────────────────────────────────────────────────────────
  const orderClause = (() => {
    switch (sort) {
      case 'price_asc':
        return 'ORDER BY COALESCE(p.discount_price, p.price) ASC';
      case 'price_desc':
        return 'ORDER BY COALESCE(p.discount_price, p.price) DESC';
      case 'popularity':
        return 'ORDER BY p.stock DESC';
      case 'newest':
      default:
        return 'ORDER BY p.created_at DESC';
    }
  })();

  // ── Count query (same filters, no pagination) ──────────────────────────────
  const countSql = `
    SELECT COUNT(*) AS total
    FROM   products p
    ${whereClause}
  `;

  // ── Data query ─────────────────────────────────────────────────────────────
  // Snapshot params length before adding pagination params
  const dataParams = [...params];
  dataParams.push(pageSize);
  const limitIdx = dataParams.length;
  dataParams.push((page - 1) * pageSize);
  const offsetIdx = dataParams.length;

  const dataSql = `
    SELECT
      p.id,
      p.sku,
      p.name,
      p.description,
      p.category_id,
      c.name            AS category_name,
      p.price,
      p.discount_price,
      p.stock,
      p.status,
      p.is_featured,
      pi.url            AS primary_image_url,
      r.avg_rating,
      p.created_at
    FROM products p
    LEFT JOIN categories c
      ON c.id = p.category_id
    LEFT JOIN LATERAL (
      SELECT url
      FROM   product_images
      WHERE  product_id = p.id AND is_primary = TRUE
      ORDER  BY sort_order ASC
      LIMIT  1
    ) pi ON TRUE
    LEFT JOIN LATERAL (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)::TEXT AS avg_rating
      FROM   reviews
      WHERE  product_id = p.id
    ) r ON TRUE
    ${whereClause}
    ${orderClause}
    LIMIT  $${limitIdx}
    OFFSET $${offsetIdx}
  `;

  // Run count and data queries in parallel
  const [countResult, dataResult] = await Promise.all([
    pool.query<{ total: string }>(countSql, params),
    pool.query<ProductListItem>(dataSql, dataParams),
  ]);

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  return { rows: dataResult.rows, total };
}

/**
 * Fetch a single product by ID, including all its images and average rating.
 *
 * Returns null if no product with that ID exists.
 * The caller is responsible for enforcing visibility rules (e.g. hiding
 * inactive products from non-admin users).
 *
 * Uses parameterized queries to prevent SQL injection
 * (Validates: Requirement 18.4).
 */
export async function getProductById(
  id: number,
): Promise<ProductDetail | null> {
  // ── Fetch the product row with joined category and avg rating ──────────────
  const productSql = `
    SELECT
      p.id,
      p.sku,
      p.name,
      p.description,
      p.category_id,
      c.name            AS category_name,
      p.price,
      p.discount_price,
      p.stock,
      p.status,
      p.is_featured,
      ROUND(AVG(r.rating)::NUMERIC, 2)::TEXT AS avg_rating,
      p.created_at
    FROM   products p
    LEFT JOIN categories c
      ON c.id = p.category_id
    LEFT JOIN reviews r
      ON r.product_id = p.id
    WHERE  p.id = $1
    GROUP  BY p.id, c.name
  `;

  const productResult = await pool.query<Omit<ProductDetail, 'images'>>(
    productSql,
    [id],
  );

  if (productResult.rows.length === 0) {
    return null;
  }

  // ── Fetch all images for the product, ordered by sort_order ───────────────
  const imagesSql = `
    SELECT id, url, is_primary, sort_order
    FROM   product_images
    WHERE  product_id = $1
    ORDER  BY sort_order ASC, id ASC
  `;

  const imagesResult = await pool.query<ProductImage>(imagesSql, [id]);

  return {
    ...productResult.rows[0],
    images: imagesResult.rows,
  };
}

// ── Admin CRUD queries ────────────────────────────────────────────────────────

export interface CreateProductParams {
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

export interface UpdateProductParams {
  name?: string;
  description?: string;
  category_id?: number | null;
  price?: number;
  discount_price?: number | null;
  stock?: number;
  status?: 'active' | 'inactive';
  is_featured?: boolean;
}

/**
 * Create a new product, optionally inserting associated images.
 * Auto-generates a SKU in format KDA-XXXXX based on the product ID.
 *
 * Returns the full ProductDetail of the newly created product.
 *
 * Uses parameterized queries (Validates: Requirements 12.1, 18.4).
 */
export async function createProduct(
  params: CreateProductParams,
): Promise<ProductDetail> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertSql = `
      INSERT INTO products
        (name, description, category_id, price, discount_price, stock, status, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    const insertResult = await client.query<{ id: number }>(insertSql, [
      params.name,
      params.description ?? null,
      params.category_id ?? null,
      params.price,
      params.discount_price ?? null,
      params.stock,
      params.status ?? 'active',
      params.is_featured ?? false,
    ]);

    const productId = insertResult.rows[0].id;

    // Auto-generate SKU: KDA-XXXXX
    const sku = `KDA-${String(productId).padStart(5, '0')}`;
    await client.query('UPDATE products SET sku = $1 WHERE id = $2', [sku, productId]);

    // Insert images if provided
    if (params.images && params.images.length > 0) {
      for (const img of params.images) {
        await client.query(
          `INSERT INTO product_images (product_id, url, is_primary, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [productId, img.url, img.is_primary ?? false, img.sort_order ?? 0],
        );
      }
    }

    await client.query('COMMIT');

    const product = await getProductById(productId);
    return product!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update an existing product.
 * Only the supplied fields are updated (partial update).
 *
 * Returns the updated ProductDetail, or null if no product with that ID exists.
 *
 * Uses parameterized queries (Validates: Requirements 12.2, 18.4).
 */
export async function updateProduct(
  id: number,
  params: UpdateProductParams,
): Promise<ProductDetail | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (params.name !== undefined) {
    values.push(params.name);
    setClauses.push(`name = $${values.length}`);
  }
  if (params.description !== undefined) {
    values.push(params.description);
    setClauses.push(`description = $${values.length}`);
  }
  if (params.category_id !== undefined) {
    values.push(params.category_id);
    setClauses.push(`category_id = $${values.length}`);
  }
  if (params.price !== undefined) {
    values.push(params.price);
    setClauses.push(`price = $${values.length}`);
  }
  if (params.discount_price !== undefined) {
    values.push(params.discount_price);
    setClauses.push(`discount_price = $${values.length}`);
  }
  if (params.stock !== undefined) {
    values.push(params.stock);
    setClauses.push(`stock = $${values.length}`);
  }
  if (params.status !== undefined) {
    values.push(params.status);
    setClauses.push(`status = $${values.length}`);
  }
  if (params.is_featured !== undefined) {
    values.push(params.is_featured);
    setClauses.push(`is_featured = $${values.length}`);
  }

  if (setClauses.length === 0) {
    return getProductById(id);
  }

  // Always update updated_at
  setClauses.push(`updated_at = NOW()`);

  values.push(id);
  const sql = `
    UPDATE products
    SET    ${setClauses.join(', ')}
    WHERE  id = $${values.length}
  `;
  const result = await pool.query(sql, values);

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return getProductById(id);
}

/**
 * Delete a product and all associated images (CASCADE).
 *
 * Returns true if deleted, false if no product with that ID was found.
 *
 * Uses parameterized queries (Validates: Requirements 12.4, 18.4).
 */
export async function deleteProduct(id: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM products WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
}
