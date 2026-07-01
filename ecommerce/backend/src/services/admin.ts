import {
  getDashboardStats,
  getDailyRevenue,
  getAllOrders,
  updateOrderStatus,
  getAllUsers,
  updateUser,
  getAllCoupons,
  createCoupon,
  deleteCoupon,
  type DashboardStats,
  type DailyRevenue,
  type AdminOrderRow,
  type AdminOrdersPage,
  type AdminUserRow,
  type AdminUsersPage,
  type CouponRow,
} from '../models/admin';
import type { PaginationMeta } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const VALID_ORDER_STATUSES = new Set([
  'Pending',
  'Confirmed',
  'Shipped',
  'Delivered',
  'Cancelled',
]);

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardResult {
  total_orders: number;
  total_customers: number;
  total_revenue: string;
  daily_revenue: DailyRevenue[];
}

/**
 * Get dashboard statistics and last-30-day daily revenue.
 *
 * Validates: Requirements 17.1, 17.2
 */
export async function getDashboard(): Promise<DashboardResult> {
  const [stats, daily] = await Promise.all([
    getDashboardStats(),
    getDailyRevenue(),
  ]);

  return {
    total_orders: stats.total_orders,
    total_customers: stats.total_customers,
    total_revenue: stats.total_revenue,
    daily_revenue: daily,
  };
}

// ── Orders ────────────────────────────────────────────────────────────────────

export interface ListAdminOrdersInput {
  page?: string | number;
  pageSize?: string | number;
  status?: string;
}

export interface ListAdminOrdersResult {
  orders: AdminOrderRow[];
  pagination: PaginationMeta;
}

/**
 * Get all orders (paginated), optionally filtered by status.
 *
 * Validates: Requirements 14.1
 */
export async function listAdminOrders(
  input: ListAdminOrdersInput,
): Promise<ListAdminOrdersResult> {
  const page = Math.max(1, parseInt(String(input.page ?? DEFAULT_PAGE), 10) || DEFAULT_PAGE);
  const rawPageSize = parseInt(String(input.pageSize ?? DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(1, rawPageSize), MAX_PAGE_SIZE);

  const { rows, total } = await getAllOrders(page, pageSize, input.status);

  return {
    orders: rows,
    pagination: { page, pageSize, total },
  };
}

export interface UpdateOrderStatusInput {
  orderId: number;
  status: string;
}

export interface UpdateOrderStatusResult {
  order: AdminOrderRow;
}

/**
 * Update an order's status.
 *
 * Throws with code 'INVALID_STATUS' if the status is not a valid value.
 * Throws with code 'NOT_FOUND' if no order with that ID exists.
 *
 * Validates: Requirements 14.2, 14.3
 */
export async function updateAdminOrderStatus(
  input: UpdateOrderStatusInput,
): Promise<UpdateOrderStatusResult> {
  if (!VALID_ORDER_STATUSES.has(input.status)) {
    const err = new Error(
      `Invalid status. Must be one of: ${[...VALID_ORDER_STATUSES].join(', ')}`,
    ) as Error & { code: string };
    err.code = 'INVALID_STATUS';
    throw err;
  }

  const order = await updateOrderStatus(input.orderId, input.status);

  if (!order) {
    const err = new Error('Order not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }

  return { order };
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface ListAdminUsersInput {
  page?: string | number;
  pageSize?: string | number;
}

export interface ListAdminUsersResult {
  users: AdminUserRow[];
  pagination: PaginationMeta;
}

/**
 * Get all users (paginated).
 *
 * Validates: Requirements 15.1
 */
export async function listAdminUsers(
  input: ListAdminUsersInput,
): Promise<ListAdminUsersResult> {
  const page = Math.max(1, parseInt(String(input.page ?? DEFAULT_PAGE), 10) || DEFAULT_PAGE);
  const rawPageSize = parseInt(String(input.pageSize ?? DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(1, rawPageSize), MAX_PAGE_SIZE);

  const { rows, total } = await getAllUsers(page, pageSize);

  return {
    users: rows,
    pagination: { page, pageSize, total },
  };
}

export interface UpdateAdminUserInput {
  userId: number;
  role?: string;
  is_active?: boolean;
}

export interface UpdateAdminUserResult {
  user: AdminUserRow;
}

/**
 * Update a user's role and/or is_active flag.
 *
 * Throws with code 'NOT_FOUND' if no user with that ID exists.
 * Throws with code 'INVALID_ROLE' if the role is not valid.
 *
 * Validates: Requirements 15.2, 15.3
 */
export async function updateAdminUser(
  input: UpdateAdminUserInput,
): Promise<UpdateAdminUserResult> {
  if (input.role !== undefined && !['customer', 'admin'].includes(input.role)) {
    const err = new Error('Invalid role. Must be "customer" or "admin"') as Error & { code: string };
    err.code = 'INVALID_ROLE';
    throw err;
  }

  const user = await updateUser(input.userId, {
    role: input.role,
    is_active: input.is_active,
  });

  if (!user) {
    const err = new Error('User not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }

  return { user };
}

// ── Coupons ───────────────────────────────────────────────────────────────────

export interface CreateCouponInput {
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string;
}

export interface CreateCouponResult {
  coupon: CouponRow;
}

/**
 * List all coupons.
 *
 * Validates: Requirements 16.4
 */
export async function listCoupons(): Promise<CouponRow[]> {
  return getAllCoupons();
}

/**
 * Create a new coupon.
 *
 * Throws with code 'DUPLICATE' for duplicate coupon codes.
 * Throws with code 'VALIDATION' for invalid discount_type.
 *
 * Validates: Requirements 16.1, 16.2
 */
export async function addCoupon(input: CreateCouponInput): Promise<CreateCouponResult> {
  if (!['percentage', 'fixed'].includes(input.discount_type)) {
    const err = new Error('discount_type must be "percentage" or "fixed"') as Error & { code: string };
    err.code = 'VALIDATION';
    throw err;
  }

  const coupon = await createCoupon({
    code: input.code,
    discount_type: input.discount_type as 'percentage' | 'fixed',
    discount_value: input.discount_value,
    expires_at: input.expires_at,
  });

  return { coupon };
}

/**
 * Delete a coupon by ID.
 *
 * Throws with code 'NOT_FOUND' if no coupon with that ID exists.
 *
 * Validates: Requirements 16.3
 */
export async function removeCoupon(couponId: number): Promise<void> {
  const deleted = await deleteCoupon(couponId);
  if (!deleted) {
    const err = new Error('Coupon not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }
}
