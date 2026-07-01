import axiosInstance from './axiosInstance';
import type { PaginationMeta } from './products';

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export interface DashboardData {
  total_orders: number;
  total_customers: number;
  total_revenue: number;
  daily_revenue: DailyRevenue[];
}

export async function getDashboard(): Promise<DashboardData> {
  const res = await axiosInstance.get<{ success: boolean; data: DashboardData }>(
    '/api/admin/dashboard',
  );
  return res.data.data;
}

// ── Admin Orders ──────────────────────────────────────────────────────────────

export interface AdminOrder {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  status: string;
  payment_method: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  created_at: string;
  updated_at: string;
}

export async function getAdminOrders(
  page = 1,
  pageSize = 20,
  status?: string,
): Promise<{ orders: AdminOrder[]; pagination: PaginationMeta }> {
  const params: Record<string, string | number> = { page, pageSize };
  if (status) params.status = status;
  const res = await axiosInstance.get<{
    success: boolean;
    data: AdminOrder[];
    pagination: PaginationMeta;
  }>('/api/admin/orders', { params });
  return { orders: res.data.data, pagination: res.data.pagination };
}

export async function updateAdminOrder(id: number, status: string): Promise<AdminOrder> {
  const res = await axiosInstance.put<{ success: boolean; data: AdminOrder }>(
    `/api/admin/orders/${id}`,
    { status },
  );
  return res.data.data;
}

// ── Admin Users ───────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export async function getAdminUsers(
  page = 1,
  pageSize = 20,
): Promise<{ users: AdminUser[]; pagination: PaginationMeta }> {
  const res = await axiosInstance.get<{
    success: boolean;
    data: AdminUser[];
    pagination: PaginationMeta;
  }>('/api/admin/users', { params: { page, pageSize } });
  return { users: res.data.data, pagination: res.data.pagination };
}

export async function updateAdminUser(
  id: number,
  payload: { role?: string; is_active?: boolean },
): Promise<AdminUser> {
  const res = await axiosInstance.put<{ success: boolean; data: AdminUser }>(
    `/api/admin/users/${id}`,
    payload,
  );
  return res.data.data;
}

// ── Coupons ───────────────────────────────────────────────────────────────────

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateCouponPayload {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  expires_at: string;
}

export async function getCoupons(): Promise<Coupon[]> {
  const res = await axiosInstance.get<{ success: boolean; data: Coupon[] }>(
    '/api/admin/coupons',
  );
  return res.data.data;
}

export async function createCoupon(payload: CreateCouponPayload): Promise<Coupon> {
  const res = await axiosInstance.post<{ success: boolean; data: Coupon }>(
    '/api/admin/coupons',
    payload,
  );
  return res.data.data;
}

export async function deleteCoupon(id: number): Promise<void> {
  await axiosInstance.delete(`/api/admin/coupons/${id}`);
}
