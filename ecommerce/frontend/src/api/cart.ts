import axiosInstance from './axiosInstance';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItemResult {
  id: number;
  product_id: number;
  product_name: string;
  price: string;
  discount_price: string | null;
  stock: number;
  quantity: number;
  image_url: string | null;
  added_at: string;
}

export interface CartData {
  items: CartItemResult[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface CartResponse {
  success: boolean;
  data: CartData;
}

// ── API functions ─────────────────────────────────────────────────────────────

/** GET /api/cart — returns the current user's cart with totals */
export async function fetchCart(): Promise<CartData> {
  const res = await axiosInstance.get<CartResponse>('/api/cart');
  return res.data.data;
}

/** POST /api/cart — add a product (or increment quantity) */
export async function addToCart(productId: number, quantity = 1): Promise<CartData> {
  const res = await axiosInstance.post<CartResponse>('/api/cart', {
    product_id: productId,
    quantity,
  });
  return res.data.data;
}

/** PUT /api/cart/:itemId — update quantity (quantity=0 removes the item) */
export async function updateCartItem(itemId: number, quantity: number): Promise<CartData> {
  const res = await axiosInstance.put<CartResponse>(`/api/cart/${itemId}`, { quantity });
  return res.data.data;
}

/** DELETE /api/cart/:itemId — remove an item entirely */
export async function removeCartItem(itemId: number): Promise<CartData> {
  const res = await axiosInstance.delete<CartResponse>(`/api/cart/${itemId}`);
  return res.data.data;
}
