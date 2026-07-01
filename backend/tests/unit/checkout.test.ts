/**
 * Unit tests for checkout-specific scenarios (Task 10.11):
 *   - Empty cart checkout returns 400
 *   - Cash on Delivery sets order status to "Confirmed"
 *   - Non-CoD sets order status to "Pending"
 *
 * All DB interactions are mocked via the order model mock.
 */

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

// Must use __esModule: true so TypeScript default import resolves correctly
jest.mock('../../src/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    }),
  },
}));

jest.mock('../../src/models/order', () => ({
  getCartItemsForCheckout: jest.fn(),
  validateUserAddress: jest.fn(),
  getCouponByCode: jest.fn(),
  createOrder: jest.fn(),
  createOrderItem: jest.fn(),
  decrementProductStock: jest.fn(),
  clearCart: jest.fn(),
  getOrdersByUser: jest.fn(),
  getOrderById: jest.fn(),
  getOrderItems: jest.fn(),
  getAddressById: jest.fn(),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import {
  getCartItemsForCheckout,
  validateUserAddress,
  getCouponByCode,
  createOrder,
  createOrderItem,
  decrementProductStock,
  clearCart,
} from '../../src/models/order';

const mockGetCartItemsForCheckout = getCartItemsForCheckout as jest.Mock;
const mockValidateUserAddress = validateUserAddress as jest.Mock;
const mockGetCouponByCode = getCouponByCode as jest.Mock;
const mockCreateOrder = createOrder as jest.Mock;
const mockCreateOrderItem = createOrderItem as jest.Mock;
const mockDecrementProductStock = decrementProductStock as jest.Mock;
const mockClearCart = clearCart as jest.Mock;

const SECRET = process.env.JWT_SECRET!;

function customerToken(id = 1) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ id, email: 'user@test.com', role: 'customer' }, SECRET, { expiresIn: '1h' } as any);
}

const cartItem = {
  product_id: 10,
  product_name: 'Widget',
  price: '25.00',
  discount_price: null,
  stock: 5,
  quantity: 2,
};

describe('POST /api/orders — checkout unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset db mock connect each time
    const db = require('../../src/db').default;
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    db.connect.mockResolvedValue(mockClient);
    mockGetCouponByCode.mockResolvedValue(null);
    mockDecrementProductStock.mockResolvedValue(undefined);
    mockClearCart.mockResolvedValue(undefined);
  });

  // ── Empty cart checkout → 400 ────────────────────────────────────────────

  it('returns 400 when the cart is empty', async () => {
    mockGetCartItemsForCheckout.mockResolvedValue([]);

    const token = customerToken();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ address_id: 1, payment_method: 'Cash on Delivery' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/empty/i);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  // ── CoD sets status to "Confirmed" ───────────────────────────────────────

  it('Cash on Delivery checkout sets order status to "Confirmed"', async () => {
    mockGetCartItemsForCheckout.mockResolvedValue([cartItem]);
    mockValidateUserAddress.mockResolvedValue(true);

    const orderRow = {
      id: 1,
      user_id: 1,
      address_id: 1,
      status: 'Confirmed',
      payment_method: 'Cash on Delivery',
      subtotal: '50.00',
      tax: '0.00',
      discount: '0.00',
      total: '50.00',
      coupon_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockCreateOrder.mockResolvedValue(orderRow);
    mockCreateOrderItem.mockResolvedValue({
      id: 1,
      order_id: 1,
      product_id: 10,
      quantity: 2,
      unit_price: '25.00',
      subtotal: '50.00',
    });

    const token = customerToken();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ address_id: 1, payment_method: 'Cash on Delivery' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Confirmed');
    expect(res.body.data.payment_method).toBe('Cash on Delivery');

    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'Confirmed', paymentMethod: 'Cash on Delivery' }),
    );
  });

  // ── Non-CoD sets status to "Pending" ─────────────────────────────────────

  it('non-CoD checkout sets order status to "Pending"', async () => {
    mockGetCartItemsForCheckout.mockResolvedValue([cartItem]);
    mockValidateUserAddress.mockResolvedValue(true);

    const orderRow = {
      id: 2,
      user_id: 1,
      address_id: 1,
      status: 'Pending',
      payment_method: 'Card',
      subtotal: '50.00',
      tax: '0.00',
      discount: '0.00',
      total: '50.00',
      coupon_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockCreateOrder.mockResolvedValue(orderRow);
    mockCreateOrderItem.mockResolvedValue({
      id: 2,
      order_id: 2,
      product_id: 10,
      quantity: 2,
      unit_price: '25.00',
      subtotal: '50.00',
    });

    const token = customerToken();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ address_id: 1, payment_method: 'Card' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Pending');
  });

  // ── Auth required ─────────────────────────────────────────────────────────

  it('returns 401 when no JWT is provided', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ address_id: 1 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
