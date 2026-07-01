import pool from '../db';

// ── Row types ─────────────────────────────────────────────────────────────────

/**
 * A cart row joined with the product's pricing and stock fields.
 * price and discount_price come back as strings from pg (NUMERIC type).
 */
export interface CartItemRow {
  id: number;           // cart.id
  user_id: number;
  product_id: number;
  product_name: string;
  price: string;          // NUMERIC → string
  discount_price: string | null;
  stock: number;
  quantity: number;
  added_at: Date;
}

// ── Query functions ───────────────────────────────────────────────────────────

/**
 * Fetch all cart rows for a user, joined with product pricing/stock.
 *
 * Uses parameterized queries to prevent SQL injection
 * (Validates: Requirement 18.4).
 */
export async function getCartItems(userId: number): Promise<CartItemRow[]> {
  const sql = `
    SELECT
      c.id,
      c.user_id,
      c.product_id,
      p.name   AS product_name,
      p.price,
      p.discount_price,
      p.stock,
      c.quantity,
      c.added_at
    FROM   cart c
    JOIN   products p ON p.id = c.product_id
    WHERE  c.user_id = $1
    ORDER  BY c.added_at ASC
  `;
  const result = await pool.query<CartItemRow>(sql, [userId]);
  return result.rows;
}

/**
 * Add a product to the user's cart, or increment quantity if it already exists.
 *
 * Returns the updated cart row (joined with product fields).
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function addToCart(
  userId: number,
  productId: number,
  quantity: number = 1,
): Promise<CartItemRow> {
  // Upsert: insert or increment quantity
  const upsertSql = `
    INSERT INTO cart (user_id, product_id, quantity)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, product_id)
    DO UPDATE SET quantity = cart.quantity + EXCLUDED.quantity
    RETURNING id
  `;
  const upsertResult = await pool.query<{ id: number }>(upsertSql, [
    userId,
    productId,
    quantity,
  ]);

  const cartId = upsertResult.rows[0].id;

  // Return the full row with product info
  const selectSql = `
    SELECT
      c.id,
      c.user_id,
      c.product_id,
      p.name   AS product_name,
      p.price,
      p.discount_price,
      p.stock,
      c.quantity,
      c.added_at
    FROM   cart c
    JOIN   products p ON p.id = c.product_id
    WHERE  c.id = $1
  `;
  const selectResult = await pool.query<CartItemRow>(selectSql, [cartId]);
  return selectResult.rows[0];
}

/**
 * Update the quantity of a cart item.
 *
 * Returns the updated row, or null if no matching item exists for this user.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function updateCartItem(
  cartItemId: number,
  userId: number,
  quantity: number,
): Promise<CartItemRow | null> {
  const updateSql = `
    UPDATE cart
    SET    quantity = $1
    WHERE  id = $2 AND user_id = $3
    RETURNING id
  `;
  const updateResult = await pool.query<{ id: number }>(updateSql, [
    quantity,
    cartItemId,
    userId,
  ]);

  if (updateResult.rows.length === 0) {
    return null;
  }

  // Return the full row with product info
  const selectSql = `
    SELECT
      c.id,
      c.user_id,
      c.product_id,
      p.name   AS product_name,
      p.price,
      p.discount_price,
      p.stock,
      c.quantity,
      c.added_at
    FROM   cart c
    JOIN   products p ON p.id = c.product_id
    WHERE  c.id = $1
  `;
  const selectResult = await pool.query<CartItemRow>(selectSql, [
    updateResult.rows[0].id,
  ]);
  return selectResult.rows[0] ?? null;
}

/**
 * Delete a cart item by its ID, scoped to a specific user.
 *
 * Returns true if a row was deleted, false if none matched.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function removeCartItem(
  cartItemId: number,
  userId: number,
): Promise<boolean> {
  const sql = `
    DELETE FROM cart
    WHERE  id = $1 AND user_id = $2
  `;
  const result = await pool.query(sql, [cartItemId, userId]);
  return (result.rowCount ?? 0) > 0;
}
