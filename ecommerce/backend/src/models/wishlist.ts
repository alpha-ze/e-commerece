import pool from '../db';

// ── Row types ─────────────────────────────────────────────────────────────────

/**
 * A wishlist row joined with product fields and its primary image.
 * price and discount_price come back as strings from pg (NUMERIC type).
 */
export interface WishlistItemRow {
  id: number;           // wishlist.id
  user_id: number;
  product_id: number;
  product_name: string;
  price: string;          // NUMERIC → string
  discount_price: string | null;
  primary_image: string | null;
  added_at: Date;
}

// ── Query functions ───────────────────────────────────────────────────────────

/**
 * Fetch all wishlist rows for a user, joined with product fields and primary image.
 *
 * Uses parameterized queries to prevent SQL injection
 * (Validates: Requirement 18.4).
 */
export async function getWishlistItems(userId: number): Promise<WishlistItemRow[]> {
  const sql = `
    SELECT
      w.id,
      w.user_id,
      w.product_id,
      p.name            AS product_name,
      p.price,
      p.discount_price,
      pi.url            AS primary_image,
      w.added_at
    FROM   wishlist w
    JOIN   products p ON p.id = w.product_id
    LEFT   JOIN product_images pi
           ON  pi.product_id = w.product_id
           AND pi.is_primary  = true
    WHERE  w.user_id = $1
    ORDER  BY w.added_at ASC
  `;
  const result = await pool.query<WishlistItemRow>(sql, [userId]);
  return result.rows;
}

/**
 * Add a product to the user's wishlist.
 *
 * Returns the newly inserted row (joined with product fields), or null if the
 * product already exists in the wishlist (UNIQUE constraint violation caught
 * and surfaced as null so the service can return a 409).
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function addToWishlist(
  userId: number,
  productId: number,
): Promise<WishlistItemRow | null> {
  // Attempt the insert; catch duplicate to return null
  const insertSql = `
    INSERT INTO wishlist (user_id, product_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, product_id) DO NOTHING
    RETURNING id
  `;
  const insertResult = await pool.query<{ id: number }>(insertSql, [userId, productId]);

  if (insertResult.rows.length === 0) {
    // Row already existed — signal duplicate
    return null;
  }

  const wishlistId = insertResult.rows[0].id;

  const selectSql = `
    SELECT
      w.id,
      w.user_id,
      w.product_id,
      p.name            AS product_name,
      p.price,
      p.discount_price,
      pi.url            AS primary_image,
      w.added_at
    FROM   wishlist w
    JOIN   products p ON p.id = w.product_id
    LEFT   JOIN product_images pi
           ON  pi.product_id = w.product_id
           AND pi.is_primary  = true
    WHERE  w.id = $1
  `;
  const selectResult = await pool.query<WishlistItemRow>(selectSql, [wishlistId]);
  return selectResult.rows[0] ?? null;
}

/**
 * Delete a wishlist entry by user + product.
 *
 * Returns true if a row was deleted, false if none matched.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function removeFromWishlist(
  userId: number,
  productId: number,
): Promise<boolean> {
  const sql = `
    DELETE FROM wishlist
    WHERE  user_id = $1 AND product_id = $2
  `;
  const result = await pool.query(sql, [userId, productId]);
  return (result.rowCount ?? 0) > 0;
}
