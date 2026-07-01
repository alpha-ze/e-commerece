// Set required env vars before app is loaded (db/index.ts requires DATABASE_URL)
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock pg so no real DB connection is attempted
jest.mock('pg', () => {
  const mockPool = { query: jest.fn(), on: jest.fn() };
  return { Pool: jest.fn(() => mockPool) };
});

import app from '../../src/app';
import { calculateCartTotals } from '../../src/utils/cart';

describe('Express app smoke test', () => {
  it('exports an Express application (function)', () => {
    expect(typeof app).toBe('function');
  });
});

describe('calculateCartTotals', () => {
  it('computes subtotal for a single item with no discount', () => {
    const result = calculateCartTotals([{ price: 10, discount_price: null, quantity: 2 }]);
    expect(result.subtotal).toBe(20);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(20);
  });

  it('uses discount_price when provided', () => {
    const result = calculateCartTotals([{ price: 100, discount_price: 80, quantity: 1 }]);
    expect(result.subtotal).toBe(80);
    expect(result.total).toBe(80);
  });

  it('applies tax rate correctly', () => {
    const result = calculateCartTotals(
      [{ price: 100, discount_price: null, quantity: 1 }],
      0.1,
    );
    expect(result.subtotal).toBe(100);
    expect(result.tax).toBe(10);
    expect(result.total).toBe(110);
  });

  it('handles multiple items and sums them', () => {
    const items = [
      { price: 50, discount_price: null, quantity: 2 },
      { price: 30, discount_price: 20, quantity: 3 },
    ];
    // 50*2 + 20*3 = 100 + 60 = 160
    const result = calculateCartTotals(items);
    expect(result.subtotal).toBe(160);
    expect(result.total).toBe(160);
  });

  it('rounds to 2 decimal places', () => {
    const result = calculateCartTotals(
      [{ price: 1.005, discount_price: null, quantity: 3 }],
      0,
    );
    expect(result.subtotal).toBe(Math.round(1.005 * 3 * 100) / 100);
  });
});
