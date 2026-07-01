import pool from '../db';
import type { PoolClient } from 'pg';

// ── Row types ─────────────────────────────────────────────────────────────────

export interface CartItemForCheckout {
  product_id: number;
  product_name: string;
  price: string;          // NUMERIC → string from pg
  discount_price: string | null;
  stock: number;
  quantity: number;
}

export interface CouponRow {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string; // NUMERIC → string from pg
  expires_at: Date;
  is_active: boolean;
}

export interface OrderRow {
  id: number;
  user_id: number;
  address_id: number;
  status: string;
  payment_method: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  coupon_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItemRow {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

// ── Query functions ───────────────────────────────────────────────────────────

/**
 * Fetch all cart items for a user with product pricing/stock details.
 * Used during checkout to build order items and calculate totals.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function getCartItemsForCheckout(
  userId: number,
): Promise<CartItemForCheckout[]> {
  const sql = `
    SELECT
      c.product_id,
      p.name   AS product_name,
      p.price,
      p.discount_price,
      p.stock,
      c.quantity
    FROM   cart c
    JOIN   products p ON p.id = c.product_id
    WHERE  c.user_id = $1
    ORDER  BY c.id ASC
  `;
  const result = await pool.query<CartItemForCheckout>(sql, [userId]);
  return result.rows;
}

/**
 * Validate that an address belongs to the given user.
 *
 * Returns true if the address exists and belongs to the user, false otherwise.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function validateUserAddress(
  addressId: number,
  userId: number,
): Promise<boolean> {
  const sql = `
    SELECT id FROM addresses
    WHERE  id = $1 AND user_id = $2
  `;
  const result = await pool.query<{ id: number }>(sql, [addressId, userId]);
  return result.rows.length > 0;
}

/**
 * Look up a coupon by code.
 *
 * Returns the coupon row if found, or null if no matching code exists.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function getCouponByCode(code: string): Promise<CouponRow | null> {
  const sql = `
    SELECT id, code, discount_type, discount_value, expires_at, is_active
    FROM   coupons
    WHERE  code = $1
  `;
  const result = await pool.query<CouponRow>(sql, [code]);
  return result.rows[0] ?? null;
}

/**
 * Create an order record inside a transaction.
 *
 * Returns the newly created order row.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function createOrder(
  client: PoolClient,
  params: {
    userId: number;
    addressId: number;
    status: string;
    paymentMethod: string;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    couponId: number | null;
  },
): Promise<OrderRow> {
  const sql = `
    INSERT INTO orders
      (user_id, address_id, status, payment_method, subtotal, tax, discount, total, coupon_id)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  const result = await client.query<OrderRow>(sql, [
    params.userId,
    params.addressId,
    params.status,
    params.paymentMethod,
    params.subtotal,
    params.tax,
    params.discount,
    params.total,
    params.couponId,
  ]);
  return result.rows[0];
}

/**
 * Insert a single order item record inside a transaction.
 *
 * Uses parameterized queries (Validates: Requirement 18.4).
 */
export async function createOrderItem(
  client: PoolClient,
  params: {
    orderId: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  },
): Promise<OrderItemRow> {
  const sql = `
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const result = await client.query<OrderItemRow>(sql, [
    params.orderId,
    params.productId,
    params.quantity,
    params.unitPrice,
    params.subtotal,
  ]);
  return result.rows[0];
}

/**
 * Decrement a product's stock by the ordered quantity inside a transaction.
 *
 * Uses parameterized queries (Validates: Requirements 10.6, 18.4).
 */
export async function decrementProductStock(
  client: PoolClient,
  productId: number,
  quantity: number,
): Promise<void> {
  const sql = `
    UPDATE products
    SET    stock = stock - $1,
           updated_at = NOW()
    WHERE  id = $2
  `;
  await client.query(sql, [quantity, productId]);
}

/**
 * Clear all cart items for a user inside a transaction.
 *
 * Uses parameterized queries (Validates: Requirements 10.7, 18.4).
 */
export async function clearCart(client: PoolClient, userId: number): Promise<void> {
  const sql = `DELETE FROM cart WHERE user_id = $1`;
  await client.query(sql, [userId]);
}

// ── Order history / detail row types ─────────────────────────────────────────

export interface OrderSummaryRow {
  id: number;
  status: string;
  payment_method: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  created_at: Date;
}

export interface OrderDetailRow {
  id: number;
  user_id: number;
  address_id: number;
  status: string;
  payment_method: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  coupon_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItemDetailRow {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface AddressRow {
  id: number;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface OrdersPage {
  rows: OrderSummaryRow[];
  total: number;
}

/**
 * Fetch a paginated list of orders for a given user, ordered by created_at DESC.
 *
 * Uses parameterized queries (Validates: Requirements 11.1, 18.4).
 */
export async function getOrdersByUser(
  userId: number,
  page: number,
  pageSize: number,
): Promise<OrdersPage> {
  const offset = (page - 1) * pageSize;

  const countSql = `SELECT COUNT(*) AS total FROM orders WHERE user_id = $1`;
  const countResult = await pool.query<{ total: string }>(countSql, [userId]);
  const total = parseInt(countResult.rows[0].total, 10);

  const rowsSql = `
    SELECT
      id,
      status,
      payment_method,
      subtotal,
      tax,
      discount,
      total,
      created_at
    FROM  orders
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT  $2 OFFSET $3
  `;
  const rowsResult = await pool.query<OrderSummaryRow>(rowsSql, [userId, pageSize, offset]);

  return { rows: rowsResult.rows, total };
}

/**
 * Fetch a single order row by its ID.
 *
 * Returns null if no order with the given ID exists.
 *
 * Uses parameterized queries (Validates: Requirements 11.2, 18.4).
 */
export async function getOrderById(orderId: number): Promise<OrderDetailRow | null> {
  const sql = `
    SELECT
      id, user_id, address_id, status, payment_method,
      subtotal, tax, discount, total, coupon_id,
      created_at, updated_at
    FROM  orders
    WHERE id = $1
  `;
  const result = await pool.query<OrderDetailRow>(sql, [orderId]);
  return result.rows[0] ?? null;
}

/**
 * Fetch all items for an order, including the product name.
 *
 * Uses parameterized queries (Validates: Requirements 11.2, 18.4).
 */
export async function getOrderItems(orderId: number): Promise<OrderItemDetailRow[]> {
  const sql = `
    SELECT
      oi.id,
      oi.product_id,
      p.name  AS product_name,
      oi.quantity,
      oi.unit_price,
      oi.subtotal
    FROM  order_items oi
    JOIN  products    p  ON p.id = oi.product_id
    WHERE oi.order_id = $1
    ORDER BY oi.id ASC
  `;
  const result = await pool.query<OrderItemDetailRow>(sql, [orderId]);
  return result.rows;
}

/**
 * Fetch the address details for a given address ID.
 *
 * Returns null if the address does not exist.
 *
 * Uses parameterized queries (Validates: Requirements 11.2, 18.4).
 */
export async function getAddressById(addressId: number): Promise<AddressRow | null> {
  const sql = `
    SELECT id, street, city, state, postal_code, country, is_default
    FROM  addresses
    WHERE id = $1
  `;
  const result = await pool.query<AddressRow>(sql, [addressId]);
  return result.rows[0] ?? null;
}
