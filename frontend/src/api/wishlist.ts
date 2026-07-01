import axiosInstance from './axiosInstance';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WishlistItemResult {
  id: number;
  product_id: number;
  product_name: string;
  price: string;
  discount_price: string | null;
  primary_image: string | null;
  added_at: string;
}

export interface WishlistData {
  items: WishlistItemResult[];
}

export interface WishlistResponse {
  success: boolean;
  data: WishlistItemResult[];
}

export interface WishlistAddResponse {
  success: boolean;
  data: WishlistItemResult[];
}

// ── API functions ─────────────────────────────────────────────────────────────

/** GET /api/wishlist — returns the current user's wishlist items */
export async function getWishlist(): Promise<WishlistData> {
  const res = await axiosInstance.get<WishlistResponse>('/api/wishlist');
  return { items: res.data.data ?? [] };
}

/** POST /api/wishlist — add a product to the wishlist */
export async function addToWishlist(productId: number): Promise<WishlistItemResult[]> {
  const res = await axiosInstance.post<WishlistAddResponse>('/api/wishlist', {
    product_id: productId,
  });
  return res.data.data ?? [];
}

/** DELETE /api/wishlist/:productId — remove a product from the wishlist */
export async function removeFromWishlist(productId: number): Promise<void> {
  await axiosInstance.delete(`/api/wishlist/${productId}`);
}
