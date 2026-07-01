import pool from '../db';

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_orders: number;
  total_customers: number;
  total_revenue: string; // NUMERIC → string from pg
}

export interface DailyRevenue {
  date: string;   // ISO date string YYYY-MM-DD
  revenue: string; // NUMERIC → string from pg
}

/**
 * Fetch aggregate dashboard statistics:
 *  - total number of orders
 *  - total number of customers (role = 'customer')
 *  - total revenue = SUM(total) for orders with status = 'Delivered'
 *
 * Uses parameterized queries (Validates: Requirements 17.1, 18.4).
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM orders)                                         AS total_orders,
      (SELECT COUNT(*) FROM users WHERE role = 'customer')                  AS total_customers,
      COALESCE(
        (SELECT SUM(total) FROM orders WHERE status = 'Delivered'), 0
      )                                                                      AS total_revenue
  `;
  const result = await pool.query<{
    total_orders: string;
    total_customers: string;
    total_revenue: string;
  }>(sql, []);

  const row = result.rows[0];
  return {
    total_orders: parseInt(row.total_orders, 10),
    total_customers: parseInt(row.total_customers, 10),
    total_revenue: row.total_revenue,
  };
}

/**
 * Fetch daily revenue totals for the last 30 days.
 * Days with no delivered orders still appear with revenue = 0.
 *
 * Uses parameterized queries (Validates: Requirements 17.2, 18.4).
 */
export async function getDailyRevenue(): Promise<DailyRevenue[]> {
  const sql = `
    WITH date_series AS (
      SELECT generate_series(
        (CURRENT_DATE - INTERVAL '29 days'),
        CURRENT_DATE,
        INTERVAL '1 day'
      )::DATE AS date
    )
    SELECT
      ds.date::TEXT               AS date,
      COALESCE(SUM(o.total), 0)::TEXT AS revenue
    FROM   date_series ds
    LEFT JOIN orders o
      ON  o.status = 'Delivered'
      AND o.created_at::DATE = ds.date
    GROUP  BY ds.date
    ORDER  BY ds.date ASC
  `;
  const result = await pool.query<DailyRevenue>(sql, []);
  return result.rows;
}

// ── Admin Orders ──────────────────────────────────────────────────────────────

export interface AdminOrderRow {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  address_id: number | null;
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

export interface AdminOrdersPage {
  rows: AdminOrderRow[];
  total: number;
}

/**
 * Fetch a paginated list of all orders (across all customers), optionally
 * filtered by status.
 *
 * Uses parameterized queries (Validates: Requirements 14.1, 18.4).
 */
export async function getAllOrders(
  page: number,
  pageSize: number,
  status?: string,
): Promise<AdminOrdersPage> {
  const offset = (page - 1) * pageSize;
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM   orders o
    ${whereClause}
  `;
  const countResult = await pool.query<{ total: string }>(countSql, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const dataParams = [...params, pageSize, offset];

  const dataSql = `
    SELECT
      o.id,
      o.user_id,
      u.name   AS user_name,
      u.email  AS user_email,
      o.address_id,
      o.status,
      o.payment_method,
      o.subtotal,
      o.tax,
      o.discount,
      o.total,
      o.coupon_id,
      o.created_at,
      o.updated_at
    FROM   orders o
    JOIN   users  u ON u.id = o.user_id
    ${whereClause}
    ORDER  BY o.created_at DESC
    LIMIT  $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;
  const dataResult = await pool.query<AdminOrderRow>(dataSql, dataParams);

  return { rows: dataResult.rows, total };
}

/**
 * Update the status of an order.
 *
 * Returns the updated order row, or null if no order with that ID exists.
 *
 * Uses parameterized queries (Validates: Requirements 14.2, 18.4).
 */
export async function updateOrderStatus(
  orderId: number,
  status: string,
): Promise<AdminOrderRow | null> {
  const sql = `
    UPDATE orders
    SET    status = $1, updated_at = NOW()
    WHERE  id = $2
    RETURNING
      id, user_id, address_id, status, payment_method,
      subtotal, tax, discount, total, coupon_id,
      created_at, updated_at
  `;
  const result = await pool.query<AdminOrderRow>(sql, [status, orderId]);
  return result.rows[0] ?? null;
}

// ── Admin Users ───────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: Date;
}

export interface AdminUsersPage {
  rows: AdminUserRow[];
  total: number;
}

/**
 * Fetch a paginated list of all users.
 *
 * Uses parameterized queries (Validates: Requirements 15.1, 18.4).
 */
export async function getAllUsers(
  page: number,
  pageSize: number,
): Promise<AdminUsersPage> {
  const offset = (page - 1) * pageSize;

  const countResult = await pool.query<{ total: string }>(
    'SELECT COUNT(*) AS total FROM users',
    [],
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const rowsResult = await pool.query<AdminUserRow>(
    `SELECT id, name, email, role, is_active, created_at
     FROM   users
     ORDER  BY created_at DESC
     LIMIT  $1 OFFSET $2`,
    [pageSize, offset],
  );

  return { rows: rowsResult.rows, total };
}

/**
 * Update a user's role and/or is_active flag.
 *
 * Returns the updated user row, or null if no user with that ID exists.
 *
 * Uses parameterized queries (Validates: Requirements 15.2, 15.3, 18.4).
 */
export async function updateUser(
  userId: number,
  updates: { role?: string; is_active?: boolean },
): Promise<AdminUserRow | null> {
  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (updates.role !== undefined) {
    params.push(updates.role);
    setClauses.push(`role = $${params.length}`);
  }

  if (updates.is_active !== undefined) {
    params.push(updates.is_active);
    setClauses.push(`is_active = $${params.length}`);
  }

  if (setClauses.length === 0) {
    // Nothing to update; return current row
    const result = await pool.query<AdminUserRow>(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
      [userId],
    );
    return result.rows[0] ?? null;
  }

  params.push(userId);
  const sql = `
    UPDATE users
    SET    ${setClauses.join(', ')}, updated_at = NOW()
    WHERE  id = $${params.length}
    RETURNING id, name, email, role, is_active, created_at
  `;
  const result = await pool.query<AdminUserRow>(sql, params);
  return result.rows[0] ?? null;
}

// ── Admin Coupons ─────────────────────────────────────────────────────────────

export interface CouponRow {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string; // NUMERIC → string
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
}

/**
 * Fetch all coupons ordered by creation date descending.
 *
 * Uses parameterized queries (Validates: Requirements 16.4, 18.4).
 */
export async function getAllCoupons(): Promise<CouponRow[]> {
  const sql = `
    SELECT id, code, discount_type, discount_value, expires_at, is_active, created_at
    FROM   coupons
    ORDER  BY created_at DESC
  `;
  const result = await pool.query<CouponRow>(sql, []);
  return result.rows;
}

/**
 * Create a new coupon.
 *
 * Returns the created coupon row.
 * Throws with code 'DUPLICATE' if the code already exists.
 *
 * Uses parameterized queries (Validates: Requirements 16.1, 16.2, 18.4).
 */
export async function createCoupon(params: {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  expires_at: string;
}): Promise<CouponRow> {
  const sql = `
    INSERT INTO coupons (code, discount_type, discount_value, expires_at)
    VALUES ($1, $2, $3, $4)
    RETURNING id, code, discount_type, discount_value, expires_at, is_active, created_at
  `;
  try {
    const result = await pool.query<CouponRow>(sql, [
      params.code,
      params.discount_type,
      params.discount_value,
      params.expires_at,
    ]);
    return result.rows[0];
  } catch (err: unknown) {
    // PostgreSQL unique violation: code 23505
    if ((err as { code?: string }).code === '23505') {
      const conflict = new Error('Coupon code already exists') as Error & { code: string };
      conflict.code = 'DUPLICATE';
      throw conflict;
    }
    throw err;
  }
}

/**
 * Delete a coupon by ID.
 *
 * Returns true if deleted, false if no row matched.
 *
 * Uses parameterized queries (Validates: Requirements 16.3, 18.4).
 */
export async function deleteCoupon(couponId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM coupons WHERE id = $1',
    [couponId],
  );
  return (result.rowCount ?? 0) > 0;
}
