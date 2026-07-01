import pool from '../db';

// ── Row type ──────────────────────────────────────────────────────────────────

export interface CategoryRow {
  id: number;
  name: string;
  created_at: Date;
}

// ── Query functions ───────────────────────────────────────────────────────────

/**
 * Fetch all categories ordered by name.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function getAllCategories(): Promise<CategoryRow[]> {
  const result = await pool.query<CategoryRow>(
    'SELECT id, name, created_at FROM categories ORDER BY name ASC',
    [],
  );
  return result.rows;
}

/**
 * Fetch a single category by ID.
 *
 * Returns null if no category with that ID exists.
 */
export async function getCategoryById(id: number): Promise<CategoryRow | null> {
  const result = await pool.query<CategoryRow>(
    'SELECT id, name, created_at FROM categories WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

/**
 * Create a new category.
 *
 * Returns the created row.
 * Throws with code 'DUPLICATE' if the name already exists (pg unique violation).
 *
 * Uses parameterized queries (Validates: Requirements 13.1, 13.2, 18.4).
 */
export async function createCategory(name: string): Promise<CategoryRow> {
  try {
    const result = await pool.query<CategoryRow>(
      'INSERT INTO categories (name) VALUES ($1) RETURNING id, name, created_at',
      [name],
    );
    return result.rows[0];
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      const conflict = new Error('Category name already exists') as Error & { code: string };
      conflict.code = 'DUPLICATE';
      throw conflict;
    }
    throw err;
  }
}

/**
 * Update a category's name.
 *
 * Returns the updated row, or null if no category with that ID exists.
 * Throws with code 'DUPLICATE' if the new name is already taken.
 *
 * Uses parameterized queries (Validates: Requirements 13.3, 18.4).
 */
export async function updateCategory(
  id: number,
  name: string,
): Promise<CategoryRow | null> {
  try {
    const result = await pool.query<CategoryRow>(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name, created_at',
      [name, id],
    );
    return result.rows[0] ?? null;
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      const conflict = new Error('Category name already exists') as Error & { code: string };
      conflict.code = 'DUPLICATE';
      throw conflict;
    }
    throw err;
  }
}

/**
 * Delete a category by ID.
 *
 * Returns true if deleted, false if no row matched.
 * Throws with code 'HAS_PRODUCTS' if products are assigned to this category.
 *
 * Uses parameterized queries (Validates: Requirements 13.4, 13.5, 18.4).
 */
export async function deleteCategory(id: number): Promise<boolean> {
  // Check if any products reference this category
  const countResult = await pool.query<{ cnt: string }>(
    'SELECT COUNT(*) AS cnt FROM products WHERE category_id = $1',
    [id],
  );
  const productCount = parseInt(countResult.rows[0].cnt, 10);

  if (productCount > 0) {
    const conflict = new Error('Category has products assigned') as Error & { code: string };
    conflict.code = 'HAS_PRODUCTS';
    throw conflict;
  }

  const result = await pool.query(
    'DELETE FROM categories WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
}
