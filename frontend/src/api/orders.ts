import axiosInstance from './axiosInstance';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

export interface OrderResult {
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
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

/** Summary shape returned by GET /api/orders list */
export interface OrderSummary {
  id: number;
  status: string;
  payment_method: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  created_at: string;
}

/** Detailed item shape returned by GET /api/orders/:id */
export interface OrderDetailItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

/** Address shape embedded in order detail */
export interface OrderDetailAddress {
  id: number;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

/** Full order detail returned by GET /api/orders/:id */
export interface OrderDetailResult {
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
  created_at: string;
  updated_at: string;
  items: OrderDetailItem[];
  address: OrderDetailAddress | null;
}

export interface OrderPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface CreateOrderPayload {
  address_id: number;
  payment_method?: string;
  coupon_code?: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

/** POST /api/orders — create a new order from the current cart */
export async function createOrder(payload: CreateOrderPayload): Promise<OrderResult> {
  const res = await axiosInstance.post<{ success: boolean; data: OrderResult }>(
    '/api/orders',
    payload,
  );
  return res.data.data;
}

/** GET /api/orders?page=&pageSize= — paginated order history */
export async function getOrders(
  page = 1,
  pageSize = 10,
): Promise<{ orders: OrderSummary[]; pagination: OrderPaginationMeta }> {
  const res = await axiosInstance.get<{
    success: boolean;
    data: OrderSummary[];
    pagination: OrderPaginationMeta;
  }>('/api/orders', { params: { page, pageSize } });
  return { orders: res.data.data, pagination: res.data.pagination };
}

/** DELETE /api/orders/:id — cancel a Pending or Confirmed order */
export async function cancelOrder(id: number): Promise<OrderDetailResult> {
  const res = await axiosInstance.delete<{ success: boolean; data: OrderDetailResult }>(
    `/api/orders/${id}`,
  );
  return res.data.data;
}

/** GET /api/orders/:id — full order detail */
export async function getOrderById(id: number): Promise<OrderDetailResult> {
  const res = await axiosInstance.get<{ success: boolean; data: OrderDetailResult }>(
    `/api/orders/${id}`,
  );
  return res.data.data;
}
