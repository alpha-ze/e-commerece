import { createContext, useState, useEffect, useCallback, useContext, type ReactNode } from 'react';
import {
  fetchCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  type CartData,
} from '../api/cart';
import { AuthContext } from './AuthContext';

// ── Context shape ─────────────────────────────────────────────────────────────

interface CartContextValue {
  cart: CartData | null;
  loading: boolean;
  error: string;
  addItem: (productId: number, qty?: number) => Promise<void>;
  updateItem: (itemId: number, qty: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  refreshCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const authCtx = useContext(AuthContext);

  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load cart whenever authentication state changes
  const refreshCart = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCart();
      setCart(data);
    } catch {
      setError('Failed to load cart.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authCtx?.user) {
      refreshCart();
    } else {
      // User logged out — clear cart state
      setCart(null);
      setError('');
    }
  }, [authCtx?.user, refreshCart]);

  // ── Mutations — each syncs state with the returned CartData ────────────────

  const addItem = useCallback(async (productId: number, qty = 1) => {
    setError('');
    try {
      const updated = await addToCart(productId, qty);
      setCart(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to add item to cart.';
      setError(message);
      throw err; // re-throw so callers can react (e.g. show toast)
    }
  }, []);

  const updateItem = useCallback(async (itemId: number, qty: number) => {
    setError('');
    try {
      const updated = await updateCartItem(itemId, qty);
      setCart(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update cart item.';
      setError(message);
      throw err;
    }
  }, []);

  const removeItem = useCallback(async (itemId: number) => {
    setError('');
    try {
      const updated = await removeCartItem(itemId);
      setCart(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to remove cart item.';
      setError(message);
      throw err;
    }
  }, []);

  return (
    <CartContext.Provider value={{ cart, loading, error, addItem, updateItem, removeItem, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}
