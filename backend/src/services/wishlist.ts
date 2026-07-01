import {
  getWishlistItems,
  addToWishlist,
  removeFromWishlist,
  type WishlistItemRow,
} from '../models/wishlist';

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface WishlistItemResult {
  id: number;
  product_id: number;
  product_name: string;
  price: string;
  discount_price: string | null;
  primary_image: string | null;
  added_at: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toWishlistItemResult(row: WishlistItemRow): WishlistItemResult {
  return {
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name,
    price: row.price,
    discount_price: row.discount_price,
    primary_image: row.primary_image,
    added_at: row.added_at,
  };
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Get the authenticated customer's wishlist.
 *
 * Validates: Requirement 8.1
 */
export async function getWishlist(userId: number): Promise<WishlistItemResult[]> {
  const rows = await getWishlistItems(userId);
  return rows.map(toWishlistItemResult);
}

export interface AddToWishlistInput {
  userId: number;
  productId: number;
}

/**
 * Add a product to the wishlist.
 *
 * Throws with code 'DUPLICATE' if the product is already in the wishlist.
 * Throws with code 'NOT_FOUND' if the product does not exist.
 *
 * Validates: Requirements 8.2, 8.3
 */
export async function addWishlistItem(
  input: AddToWishlistInput,
): Promise<WishlistItemResult[]> {
  const { userId, productId } = input;

  // Verify the product exists
  const { default: pool } = await import('../db');
  const productResult = await pool.query<{ id: number }>(
    'SELECT id FROM products WHERE id = $1',
    [productId],
  );

  if (productResult.rows.length === 0) {
    const err = new Error('Product not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }

  const inserted = await addToWishlist(userId, productId);

  if (inserted === null) {
    const err = new Error('Product is already in your wishlist') as Error & { code: string };
    err.code = 'DUPLICATE';
    throw err;
  }

  // Return the full updated wishlist
  const rows = await getWishlistItems(userId);
  return rows.map(toWishlistItemResult);
}

export interface RemoveFromWishlistInput {
  userId: number;
  productId: number;
}

/**
 * Remove a product from the wishlist.
 *
 * Throws with code 'NOT_FOUND' if the item doesn't exist in this user's wishlist.
 *
 * Validates: Requirement 8.4
 */
export async function removeWishlistItem(
  input: RemoveFromWishlistInput,
): Promise<WishlistItemResult[]> {
  const { userId, productId } = input;

  const removed = await removeFromWishlist(userId, productId);
  if (!removed) {
    const err = new Error('Wishlist item not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Return the updated wishlist
  const rows = await getWishlistItems(userId);
  return rows.map(toWishlistItemResult);
}
