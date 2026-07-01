-- ============================================================
-- E-Commerce Web Application — Seed Data
-- Run via: npm run db:seed
-- Uses INSERT ... ON CONFLICT DO NOTHING for idempotency.
-- ============================================================

-- ---- Users ----
-- Admin (password: Admin@1234)
INSERT INTO users (name, email, password, role, is_active)
VALUES (
    'Admin User',
    'admin@example.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lkCy',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Customer 1 (password: Customer@1234)
INSERT INTO users (name, email, password, role, is_active)
VALUES (
    'Alice Johnson',
    'alice@example.com',
    '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm',
    'customer',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Customer 2 (password: Customer@1234)
INSERT INTO users (name, email, password, role, is_active)
VALUES (
    'Bob Smith',
    'bob@example.com',
    '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm',
    'customer',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- ---- Categories ----
INSERT INTO categories (name) VALUES ('Electronics')      ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name) VALUES ('Clothing')         ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name) VALUES ('Books')            ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name) VALUES ('Home & Kitchen')   ON CONFLICT (name) DO NOTHING;

-- ---- Products ----
-- Electronics (featured)
INSERT INTO products (name, description, category_id, price, discount_price, stock, status, is_featured)
SELECT
    'Wireless Noise-Cancelling Headphones',
    'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and foldable design.',
    id, 129.99, 99.99, 50, 'active', TRUE
FROM categories WHERE name = 'Electronics'
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, category_id, price, discount_price, stock, status, is_featured)
SELECT
    'Smartphone 128GB',
    '6.5-inch AMOLED display, 48MP triple camera, 5000mAh battery, and 128GB internal storage.',
    id, 699.99, 649.99, 30, 'active', TRUE
FROM categories WHERE name = 'Electronics'
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, category_id, price, discount_price, stock, status, is_featured)
SELECT
    'USB-C Hub 7-in-1',
    'Multi-port hub with HDMI 4K, 3× USB-A 3.0, SD/microSD card readers, and 100W PD charging.',
    id, 49.99, NULL, 120, 'active', FALSE
FROM categories WHERE name = 'Electronics'
ON CONFLICT DO NOTHING;

-- Clothing (featured)
INSERT INTO products (name, description, category_id, price, discount_price, stock, status, is_featured)
SELECT
    'Classic Cotton T-Shirt',
    '100% organic cotton, available in 10 colours, pre-shrunk, machine washable.',
    id, 24.99, 19.99, 200, 'active', TRUE
FROM categories WHERE name = 'Clothing'
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, category_id, price, discount_price, stock, status, is_featured)
SELECT
    'Slim-Fit Chino Trousers',
    'Stretch-cotton blend chinos with a modern slim fit. Available in Navy, Khaki, and Olive.',
    id, 59.99, NULL, 80, 'active', FALSE
FROM categories WHERE name = 'Clothing'
ON CONFLICT DO NOTHING;

-- Books (featured)
INSERT INTO products (name, description, category_id, price, discount_price, stock, status, is_featured)
SELECT
    'Clean Code: A Handbook of Agile Software Craftsmanship',
    'Robert C. Martin''s guide to writing readable, maintainable, and elegant code.',
    id, 39.99, 29.99, 60, 'active', TRUE
FROM categories WHERE name = 'Books'
ON CONFLICT DO NOTHING;

-- Home & Kitchen
INSERT INTO products (name, description, category_id, price, discount_price, stock, status, is_featured)
SELECT
    'Stainless Steel Insulated Water Bottle 1L',
    'Double-wall vacuum insulation keeps drinks cold 24h or hot 12h. BPA-free, leak-proof lid.',
    id, 34.99, 27.99, 150, 'active', FALSE
FROM categories WHERE name = 'Home & Kitchen'
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, category_id, price, discount_price, stock, status, is_featured)
SELECT
    'Non-Stick Ceramic Frying Pan 28cm',
    'PFOA-free ceramic coating, compatible with all hob types including induction. Oven-safe to 200°C.',
    id, 44.99, NULL, 75, 'active', FALSE
FROM categories WHERE name = 'Home & Kitchen'
ON CONFLICT DO NOTHING;

-- ---- Product Images ----
-- Product 1: Wireless Headphones
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/product-1.jpg', TRUE, 0 FROM products WHERE name = 'Wireless Noise-Cancelling Headphones'
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/product-1b.jpg', FALSE, 1 FROM products WHERE name = 'Wireless Noise-Cancelling Headphones'
ON CONFLICT DO NOTHING;

-- Product 2: Smartphone
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/product-2.jpg', TRUE, 0 FROM products WHERE name = 'Smartphone 128GB'
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/product-2b.jpg', FALSE, 1 FROM products WHERE name = 'Smartphone 128GB'
ON CONFLICT DO NOTHING;

-- Product 3: USB-C Hub
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/product-3.jpg', TRUE, 0 FROM products WHERE name = 'USB-C Hub 7-in-1'
ON CONFLICT DO NOTHING;

-- Product 4: Cotton T-Shirt
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/product-4.jpg', TRUE, 0 FROM products WHERE name = 'Classic Cotton T-Shirt'
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/product-4b.jpg', FALSE, 1 FROM products WHERE name = 'Classic Cotton T-Shirt'
ON CONFLICT DO NOTHING;

-- Product 5: Chino Trousers
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/product-5.jpg', TRUE, 0 FROM products WHERE name = 'Slim-Fit Chino Trousers'
ON CONFLICT DO NOTHING;

-- Product 6: Clean Code book
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/product-6.jpg', TRUE, 0 FROM products WHERE name = 'Clean Code: A Handbook of Agile Software Craftsmanship'
ON CONFLICT DO NOTHING;

-- Product 7: Water Bottle
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/product-7.jpg', TRUE, 0 FROM products WHERE name = 'Stainless Steel Insulated Water Bottle 1L'
ON CONFLICT DO NOTHING;

-- Product 8: Frying Pan
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/product-8.jpg', TRUE, 0 FROM products WHERE name = 'Non-Stick Ceramic Frying Pan 28cm'
ON CONFLICT DO NOTHING;

-- ---- Coupon ----
INSERT INTO coupons (code, discount_type, discount_value, expires_at, is_active)
VALUES (
    'SAVE10',
    'percentage',
    10.00,
    NOW() + INTERVAL '1 year',
    TRUE
) ON CONFLICT (code) DO NOTHING;

-- ---- Addresses ----
INSERT INTO addresses (user_id, street, city, state, postal_code, country, is_default)
SELECT id, '123 Maple Street', 'Springfield', 'Illinois', '62701', 'United States', TRUE
FROM users WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO addresses (user_id, street, city, state, postal_code, country, is_default)
SELECT id, '456 Oak Avenue', 'Austin', 'Texas', '78701', 'United States', TRUE
FROM users WHERE email = 'bob@example.com'
ON CONFLICT DO NOTHING;
