import {
  getCartItems,
  addToCart,
  updateCartItem,
  removeCartItem,
  type CartItemRow,
} from '../models/cart';
import { calculateCartTotals, type CartItem, type CartTotals } from '../utils/cart';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Read TAX_RATE from environment with a fallback of 0. */
function getTaxRate(): number {
  const raw = process.env.TAX_RATE;
  if (raw === undefined || raw === '') return 0;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface CartItemResult {
  id: number;
  product_id: number;
  product_name: string;
  price: string;
  discount_price: string | null;
  stock: number;
  quantity: number;
  added_at: Date;
}

export interface CartResult {
  items: CartItemResult[];
  subtotal: number;
  tax: number;
  total: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toCartItem(row: CartItemRow): CartItem {
  return {
    price: parseFloat(row.price),
    discount_price: row.discount_price !== null ? parseFloat(row.discount_price) : null,
    quantity: row.quantity,
  };
}

function toCartItemResult(row: CartItemRow): CartItemResult {
  return {
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name,
    price: row.price,
    discount_price: row.discount_price,
    stock: row.stock,
    quantity: row.quantity,
    added_at: row.added_at,
  };
}

function buildCartResult(rows: CartItemRow[]): CartResult {
  const items = rows.map(toCartItemResult);
  const totals: CartTotals = calculateCartTotals(
    rows.map(toCartItem),
    getTaxRate(),
  );
  return { items, ...totals };
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Get the authenticated customer's cart with totals.
 *
 * Validates: Requirement 7.1
 */
export async function getCart(userId: number): Promise<CartResult> {
  const rows = await getCartItems(userId);
  return buildCartResult(rows);
}

export interface AddItemInput {
  userId: number;
  productId: number;
  quantity?: number;
}

/**
 * Add an item to the cart (or increment if already present).
 *
 * Throws with code 'OUT_OF_STOCK' if the product has stock = 0.
 * Throws with code 'NOT_FOUND' if the product does not exist.
 *
 * Validates: Requirements 7.2, 7.3
 */
export async function addItem(input: AddItemInput): Promise<CartResult> {
  const { userId, productId, quantity = 1 } = input;

  // Validate stock before inserting.
  // We query the products table directly to avoid a separate model file dependency.
  const { default: pool } = await import('../db');
  const stockResult = await pool.query<{ stock: number }>(
    'SELECT stock FROM products WHERE id = $1',
    [productId],
  );

  if (stockResult.rows.length === 0) {
    const err = new Error('Product not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (stockResult.rows[0].stock === 0) {
    const err = new Error('Product is out of stock') as Error & { code: string };
    err.code = 'OUT_OF_STOCK';
    throw err;
  }

  await addToCart(userId, productId, quantity);

  const rows = await getCartItems(userId);
  return buildCartResult(rows);
}

export interface UpdateItemInput {
  userId: number;
  cartItemId: number;
  quantity: number;
}

/**
 * Update the quantity of a cart item.
 * - quantity > 0 → update to new quantity
 * - quantity = 0 → remove the item
 *
 * Throws with code 'NOT_FOUND' if the item does not belong to this user.
 *
 * Validates: Requirements 7.4, 7.5
 */
export async function updateItem(input: UpdateItemInput): Promise<CartResult> {
  const { userId, cartItemId, quantity } = input;

  if (quantity === 0) {
    // quantity = 0 means remove
    const removed = await removeCartItem(cartItemId, userId);
    if (!removed) {
      const err = new Error('Cart item not found') as Error & { code: string };
      err.code = 'NOT_FOUND';
      throw err;
    }
  } else {
    const updated = await updateCartItem(cartItemId, userId, quantity);
    if (!updated) {
      const err = new Error('Cart item not found') as Error & { code: string };
      err.code = 'NOT_FOUND';
      throw err;
    }
  }

  const rows = await getCartItems(userId);
  return buildCartResult(rows);
}

export interface RemoveItemInput {
  userId: number;
  cartItemId: number;
}

/**
 * Remove an item from the cart.
 *
 * Throws with code 'NOT_FOUND' if the item does not belong to this user.
 *
 * Validates: Requirement 7.5
 */
export async function removeItem(input: RemoveItemInput): Promise<CartResult> {
  const { userId, cartItemId } = input;

  const removed = await removeCartItem(cartItemId, userId);
  if (!removed) {
    const err = new Error('Cart item not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }

  const rows = await getCartItems(userId);
  return buildCartResult(rows);
}
