import pool from '../db';
import {
  getCartItemsForCheckout,
  validateUserAddress,
  getCouponByCode,
  createOrder,
  createOrderItem,
  decrementProductStock,
  clearCart,
  getOrdersByUser,
  getOrderById,
  getOrderItems,
  getAddressById,
  type CartItemForCheckout,
  type OrderSummaryRow,
} from '../models/order';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Read TAX_RATE from environment with a fallback of 0.
 */
function getTaxRate(): number {
  const raw = process.env.TAX_RATE;
  if (raw === undefined || raw === '') return 0;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Determine the effective price for a cart item.
 * Returns discount_price if set, otherwise price.
 */
function effectivePrice(item: CartItemForCheckout): number {
  if (item.discount_price !== null && item.discount_price !== undefined) {
    const dp = parseFloat(item.discount_price);
    if (Number.isFinite(dp)) return dp;
  }
  return parseFloat(item.price);
}

// ── Input / Output types ──────────────────────────────────────────────────────

export interface CheckoutInput {
  userId: number;
  addressId: number;
  paymentMethod?: string;
  couponCode?: string;
}

export interface OrderItemResult {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderResult {
  id: number;
  user_id: number;
  address_id: number;
  status: string;
  payment_method: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  coupon_id: number | null;
  created_at: Date;
  updated_at: Date;
  items: OrderItemResult[];
}

// ── Service function ──────────────────────────────────────────────────────────

/**
 * Perform checkout:
 * 1. Validate cart is non-empty
 * 2. Validate address belongs to user
 * 3. Validate coupon (if provided)
 * 4. Calculate totals (subtotal, tax, discount, total)
 * 5. In a single transaction:
 *    a. Create order record
 *    b. Insert order_items
 *    c. Decrement product stock
 *    d. Clear customer's cart
 *
 * Throws coded errors for known failure cases:
 *   - EMPTY_CART      : cart has no items
 *   - INVALID_ADDRESS : address not found or not owned by user
 *   - INVALID_COUPON  : coupon not found, inactive, or expired
 *
 * Validates: Requirements 10.1–10.7
 */
export async function checkout(input: CheckoutInput): Promise<OrderResult> {
  const {
    userId,
    addressId,
    paymentMethod = 'Cash on Delivery',
    couponCode,
  } = input;

  // ── 1. Load and validate cart ──────────────────────────────────────────────
  const cartItems = await getCartItemsForCheckout(userId);

  if (cartItems.length === 0) {
    const err = new Error('Cart is empty') as Error & { code: string };
    err.code = 'EMPTY_CART';
    throw err;
  }

  // ── 2. Validate address ownership ─────────────────────────────────────────
  const addressValid = await validateUserAddress(addressId, userId);
  if (!addressValid) {
    const err = new Error('Invalid address') as Error & { code: string };
    err.code = 'INVALID_ADDRESS';
    throw err;
  }

  // ── 3. Validate and resolve coupon ─────────────────────────────────────────
  let couponId: number | null = null;
  let couponDiscountType: 'percentage' | 'fixed' = 'fixed';
  let couponDiscountValue = 0;

  if (couponCode) {
    const coupon = await getCouponByCode(couponCode);

    if (!coupon) {
      const err = new Error('Coupon code not found') as Error & { code: string };
      err.code = 'INVALID_COUPON';
      throw err;
    }

    if (!coupon.is_active) {
      const err = new Error('Coupon is inactive') as Error & { code: string };
      err.code = 'INVALID_COUPON';
      throw err;
    }

    if (new Date(coupon.expires_at) < new Date()) {
      const err = new Error('Coupon has expired') as Error & { code: string };
      err.code = 'INVALID_COUPON';
      throw err;
    }

    couponId = coupon.id;
    couponDiscountType = coupon.discount_type;
    couponDiscountValue = parseFloat(coupon.discount_value);
  }

  // ── 4. Calculate totals ────────────────────────────────────────────────────
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + effectivePrice(item) * item.quantity;
  }, 0);

  const couponDiscount = couponId !== null
    ? (couponDiscountType === 'percentage'
        ? subtotal * (couponDiscountValue / 100)
        : couponDiscountValue)
    : 0;

  const taxRate = getTaxRate();
  const tax = subtotal * taxRate;
  const discount = couponDiscount;
  const total = subtotal + tax - discount;
  // Cash on Delivery → "Confirmed" (Requirement 10.3)
  const status = paymentMethod === 'Cash on Delivery' ? 'Confirmed' : 'Pending';

  // ── 6. Run everything in a single transaction ──────────────────────────────
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // a. Create order record
    const order = await createOrder(client, {
      userId,
      addressId,
      status,
      paymentMethod,
      subtotal,
      tax,
      discount,
      total,
      couponId,
    });

    // b. Insert order_items and c. Decrement stock
    const orderItemResults: OrderItemResult[] = [];

    for (const item of cartItems) {
      const unitPrice = effectivePrice(item);
      const itemSubtotal = unitPrice * item.quantity;

      const orderItem = await createOrderItem(client, {
        orderId: order.id,
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
      });

      orderItemResults.push({
        id: orderItem.id,
        product_id: orderItem.product_id,
        quantity: orderItem.quantity,
        unit_price: parseFloat(orderItem.unit_price),
        subtotal: parseFloat(orderItem.subtotal),
      });

      // c. Decrement stock (Requirement 10.6)
      await decrementProductStock(client, item.product_id, item.quantity);
    }

    // d. Clear the customer's cart (Requirement 10.7)
    await clearCart(client, userId);

    await client.query('COMMIT');

    return {
      id: order.id,
      user_id: order.user_id,
      address_id: order.address_id,
      status: order.status,
      payment_method: order.payment_method,
      subtotal: parseFloat(order.subtotal),
      tax: parseFloat(order.tax),
      discount: parseFloat(order.discount),
      total: parseFloat(order.total),
      coupon_id: order.coupon_id,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: orderItemResults,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Order history / detail types ──────────────────────────────────────────────

export interface OrderSummary {
  id: number;
  status: string;
  payment_method: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  created_at: Date;
}

export interface OrderHistoryResult {
  orders: OrderSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface OrderItemDetail {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface AddressDetail {
  id: number;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface OrderDetailResult {
  id: number;
  user_id: number;
  address_id: number;
  status: string;
  payment_method: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  coupon_id: number | null;
  created_at: Date;
  updated_at: Date;
  items: OrderItemDetail[];
  address: AddressDetail | null;
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Return a paginated list of orders for the given customer.
 *
 * Validates: Requirement 11.1
 */
export async function getOrderHistory(
  userId: number,
  page: number,
  pageSize: number,
): Promise<OrderHistoryResult> {
  const { rows, total } = await getOrdersByUser(userId, page, pageSize);

  const orders: OrderSummary[] = rows.map((row) => ({
    id: row.id,
    status: row.status,
    payment_method: row.payment_method,
    subtotal: parseFloat(row.subtotal),
    tax: parseFloat(row.tax),
    discount: parseFloat(row.discount),
    total: parseFloat(row.total),
    created_at: row.created_at,
  }));

  return {
    orders,
    pagination: { page, pageSize, total },
  };
}

/**
 * Return the full detail of a single order.
 *
 * Throws coded errors for known failure cases:
 *   - ORDER_NOT_FOUND : no order with this ID exists
 *   - ORDER_FORBIDDEN : order belongs to a different user (Requirement 11.4)
 *
 * Validates: Requirements 11.2, 11.4
 */
export async function getOrderDetail(
  orderId: number,
  requestingUserId: number,
): Promise<OrderDetailResult> {
  const order = await getOrderById(orderId);

  if (!order) {
    const err = new Error('Order not found') as Error & { code: string };
    err.code = 'ORDER_NOT_FOUND';
    throw err;
  }

  // Requirement 11.4 — order isolation between customers
  if (order.user_id !== requestingUserId) {
    const err = new Error('You do not have permission to view this order') as Error & {
      code: string;
    };
    err.code = 'ORDER_FORBIDDEN';
    throw err;
  }

  const [items, address] = await Promise.all([
    getOrderItems(orderId),
    order.address_id ? getAddressById(order.address_id) : Promise.resolve(null),
  ]);

  return {
    id: order.id,
    user_id: order.user_id,
    address_id: order.address_id,
    status: order.status,
    payment_method: order.payment_method,
    subtotal: parseFloat(order.subtotal),
    tax: parseFloat(order.tax),
    discount: parseFloat(order.discount),
    total: parseFloat(order.total),
    coupon_id: order.coupon_id,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items: items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: parseFloat(item.unit_price),
      subtotal: parseFloat(item.subtotal),
    })),
    address: address ?? null,
  };
}
