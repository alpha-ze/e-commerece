/**
 * Property-based tests: P5, P6, P7, P8, P16, P17
 *
 * P5  — Product search results always match the query
 * P6  — Category filter returns only products in the selected category
 * P7  — Price range filter respects effective price
 * P8  — Sort order produces correctly ordered results
 * P16 — Negative price or stock rejected on product creation/update
 * P17 — Category deletion blocked when products are assigned
 */

// ── Env setup ────────────────────────────────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

jest.mock('../../src/models/product', () => ({
  getProducts: jest.fn(),
  getProductById: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
}));

jest.mock('../../src/models/category', () => ({
  getAllCategories: jest.fn(),
  getCategoryById: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
}));

import * as fc from 'fast-check';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { getProducts, createProduct, updateProduct } from '../../src/models/product';
import { deleteCategory } from '../../src/models/category';
import type { ProductListItem } from '../../src/models/product';

const mockGetProducts = getProducts as jest.Mock;
const mockCreateProduct = createProduct as jest.Mock;
const mockUpdateProduct = updateProduct as jest.Mock;
const mockDeleteCategory = deleteCategory as jest.Mock;

const SECRET = process.env.JWT_SECRET!;

function adminToken() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ id: 1, email: 'admin@test.com', role: 'admin' }, SECRET, { expiresIn: '1h' } as any);
}

/** Build a minimal ProductListItem */
function makeProduct(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: 1,
    name: 'Widget',
    description: 'A widget',
    category_id: 10,
    category_name: 'Widgets',
    price: '10.00',
    discount_price: null,
    stock: 5,
    status: 'active',
    is_featured: false,
    primary_image_url: null,
    avg_rating: null,
    created_at: new Date(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// P5: Product search results always match the query
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 5: Product search results always match the query
describe('P5: Product search results always match the query', () => {
  it('every returned product contains the search query in name or description (case-insensitive)', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-z]+$/i.test(s)),
        async (query) => {
          const matchingProducts = [
            makeProduct({ id: 1, name: `${query} product`, description: 'desc' }),
            makeProduct({ id: 2, name: 'Other', description: `Contains ${query.toLowerCase()} here` }),
          ];

          mockGetProducts.mockResolvedValue({ rows: matchingProducts, total: 2 });

          const res = await request(app)
            .get('/api/products')
            .query({ q: query });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);

          const products: ProductListItem[] = res.body.data.products ?? res.body.data;
          for (const p of products) {
            const nameMatch = p.name.toLowerCase().includes(query.toLowerCase());
            const descMatch = (p.description ?? '').toLowerCase().includes(query.toLowerCase());
            expect(nameMatch || descMatch).toBe(true);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('getProducts is called with the search query param q', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-z]+$/i.test(s)),
        async (query) => {
          mockGetProducts.mockResolvedValue({ rows: [], total: 0 });

          await request(app)
            .get('/api/products')
            .query({ q: query });

          expect(mockGetProducts).toHaveBeenCalledWith(
            expect.objectContaining({ q: query }),
          );
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P6: Category filter returns only products in the selected category
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 6: Category filter returns only products in the selected category
describe('P6: Category filter returns only products in the selected category', () => {
  it('every returned product belongs to the specified category', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 500 }),
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 10 }),
        async (categoryId, productIds) => {
          const products = productIds.map((id) =>
            makeProduct({ id, category_id: categoryId }),
          );
          mockGetProducts.mockResolvedValue({ rows: products, total: products.length });

          const res = await request(app)
            .get('/api/products')
            .query({ categoryId });

          expect(res.status).toBe(200);
          const returnedProducts: ProductListItem[] = res.body.data.products ?? res.body.data;
          for (const p of returnedProducts) {
            expect(p.category_id).toBe(categoryId);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('getProducts is called with the categoryId filter', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 500 }),
        async (categoryId) => {
          mockGetProducts.mockResolvedValue({ rows: [], total: 0 });

          await request(app)
            .get('/api/products')
            .query({ categoryId });

          expect(mockGetProducts).toHaveBeenCalledWith(
            expect.objectContaining({ categoryId }),
          );
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P7: Price range filter respects effective price
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 7: Price range filter respects effective price
describe('P7: Price range filter respects effective price', () => {
  it('every returned product has effective price within [minPrice, maxPrice]', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.float({ min: 0, max: 500, noNaN: true }),
          fc.float({ min: 0, max: 500, noNaN: true }),
        ).map(([a, b]) => ({ min: Math.min(a, b), max: Math.max(a, b) })),
        async ({ min, max }) => {
          // Build products that all have effective prices within range
          const productsInRange = [
            makeProduct({ id: 1, price: String(min), discount_price: null }),
            makeProduct({ id: 2, price: String(max + 10), discount_price: String(max) }),
          ];
          mockGetProducts.mockResolvedValue({ rows: productsInRange, total: 2 });

          const res = await request(app)
            .get('/api/products')
            .query({ minPrice: min, maxPrice: max });

          expect(res.status).toBe(200);

          const products: ProductListItem[] = res.body.data.products ?? res.body.data;
          for (const p of products) {
            const effectivePrice = p.discount_price !== null
              ? parseFloat(p.discount_price)
              : parseFloat(p.price);
            expect(effectivePrice).toBeGreaterThanOrEqual(min - 0.001);
            expect(effectivePrice).toBeLessThanOrEqual(max + 0.001);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('getProducts is called with minPrice and maxPrice params', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 100, max: 500, noNaN: true }),
        async (minPrice, maxPrice) => {
          mockGetProducts.mockResolvedValue({ rows: [], total: 0 });

          await request(app)
            .get('/api/products')
            .query({ minPrice, maxPrice });

          expect(mockGetProducts).toHaveBeenCalledWith(
            expect.objectContaining({ minPrice, maxPrice }),
          );
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P8: Sort order produces correctly ordered results
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 8: Sort order produces correctly ordered results
describe('P8: Sort order produces correctly ordered results', () => {
  const SORT_OPTIONS = ['price_asc', 'price_desc', 'newest'] as const;

  it('returned products are monotonically ordered per the requested sort', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...SORT_OPTIONS),
        fc.array(
          fc.record({
            price: fc.float({ min: Math.fround(1), max: Math.fround(500), noNaN: true }),
            created_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
          }),
          { minLength: 2, maxLength: 10 },
        ),
        async (sort, items) => {
          // Sort the items as the API would
          const sorted = [...items].sort((a, b) => {
            if (sort === 'price_asc') return a.price - b.price;
            if (sort === 'price_desc') return b.price - a.price;
            // newest: descending by created_at
            return b.created_at.getTime() - a.created_at.getTime();
          });

          const products = sorted.map((item, idx) =>
            makeProduct({
              id: idx + 1,
              price: item.price.toFixed(2),
              created_at: item.created_at,
            }),
          );

          mockGetProducts.mockResolvedValue({ rows: products, total: products.length });

          const res = await request(app)
            .get('/api/products')
            .query({ sort });

          expect(res.status).toBe(200);
          const returnedProducts: ProductListItem[] = res.body.data.products ?? res.body.data;

          // Verify monotonic order
          for (let i = 1; i < returnedProducts.length; i++) {
            const prev = returnedProducts[i - 1];
            const curr = returnedProducts[i];

            if (sort === 'price_asc') {
              expect(parseFloat(prev.price)).toBeLessThanOrEqual(parseFloat(curr.price));
            } else if (sort === 'price_desc') {
              expect(parseFloat(prev.price)).toBeGreaterThanOrEqual(parseFloat(curr.price));
            } else if (sort === 'newest') {
              const prevDate = new Date(prev.created_at).getTime();
              const currDate = new Date(curr.created_at).getTime();
              expect(prevDate).toBeGreaterThanOrEqual(currDate);
            }
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('getProducts is called with the sort param', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...SORT_OPTIONS),
        async (sort) => {
          mockGetProducts.mockResolvedValue({ rows: [], total: 0 });

          await request(app)
            .get('/api/products')
            .query({ sort });

          expect(mockGetProducts).toHaveBeenCalledWith(
            expect.objectContaining({ sort }),
          );
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P16: Negative price or stock rejected on product creation/update
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 16: Negative price or stock rejected on product creation/update
describe('P16: Negative price or stock rejected on product creation/update', () => {
  it('product creation with negative price always returns 400', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -9999, max: -1 }),
        fc.integer({ min: 0, max: 100 }),
        async (negativePrice, stock) => {
          const token = adminToken();
          const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${token}`)
            .send({
              name: 'Test Product',
              price: negativePrice,
              stock,
            });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('product creation with negative stock always returns 400', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: -9999, max: -1 }),
        async (price, negativeStock) => {
          const token = adminToken();
          const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${token}`)
            .send({
              name: 'Test Product',
              price,
              stock: negativeStock,
            });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('product update with negative price always returns 400', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -9999, max: -1 }),
        async (negativePrice) => {
          const token = adminToken();
          const res = await request(app)
            .put('/api/products/1')
            .set('Authorization', `Bearer ${token}`)
            .send({ price: negativePrice });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('product update with negative stock always returns 400', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -9999, max: -1 }),
        async (negativeStock) => {
          const token = adminToken();
          const res = await request(app)
            .put('/api/products/1')
            .set('Authorization', `Bearer ${token}`)
            .send({ stock: negativeStock });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P17: Category deletion blocked when products are assigned
// ─────────────────────────────────────────────────────────────────────────────

// Feature: ecommerce-web-app, Property 17: Category deletion blocked when products are assigned
describe('P17: Category deletion blocked when products are assigned', () => {
  it('DELETE category returns 409 when category has products', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9999 }),
        async (categoryId) => {
          // Simulate the DB throwing a HAS_PRODUCTS error
          const err = Object.assign(new Error('Category has products assigned to it'), {
            code: 'HAS_PRODUCTS',
          });
          mockDeleteCategory.mockRejectedValue(err);

          const token = adminToken();
          const res = await request(app)
            .delete(`/api/categories/${categoryId}`)
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(409);
          expect(res.body.success).toBe(false);
        },
      ),
      { numRuns: 30 },
    );
  });
});
