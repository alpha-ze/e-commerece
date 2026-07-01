export interface CartItem {
  price: number;
  discount_price: number | null;
  quantity: number;
}

export interface CartTotals {
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Calculates cart totals from a list of items.
 *
 * effective_price = discount_price ?? price
 * subtotal        = SUM(effective_price × quantity)
 * tax             = subtotal × taxRate
 * total           = subtotal + tax
 *
 * All values are rounded to 2 decimal places.
 */
export function calculateCartTotals(items: CartItem[], taxRate: number = 0): CartTotals {
  const subtotal = items.reduce((sum, item) => {
    const effectivePrice = item.discount_price ?? item.price;
    return sum + effectivePrice * item.quantity;
  }, 0);

  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
