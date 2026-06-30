# Tasks

## Task List

- [x] 1. Project Setup and Infrastructure
  - [x] 1.1 Initialize backend Node.js/Express project with TypeScript, folder structure, and environment variable loading
  - [x] 1.2 Initialize frontend React project with Vite, React Router, Axios, and Tailwind CSS
  - [x] 1.3 Create PostgreSQL schema (all tables from design) and a migration/seed script
  - [x] 1.4 Configure CORS, Helmet, global error handler, and rate limiter middleware on backend
  - [x] 1.5 Set up Jest + fast-check for backend; Jest + React Testing Library + fast-check for frontend

- [x] 2. Authentication
  - [x] 2.1 Implement POST /api/auth/register with bcrypt hashing, duplicate-email check, JWT issuance
  - [x] 2.2 Implement POST /api/auth/login with credential validation and JWT issuance (7-day expiry)
  - [x] 2.3 Implement forgot-password and reset-password endpoints (token generation, email send, token validation)
  - [x] 2.4 Implement JWT verification middleware and requireRole middleware
  - [x] 2.5 Build Login, Register, ForgotPassword, and ResetPassword pages with form validation
  - [x] 2.6 Implement AuthContext, useAuth hook, PrivateRoute, and AdminRoute components; attach JWT to Axios

- [x] 3. Product Catalog and Search
  - [x] 3.1 Implement GET /api/products with pagination, search, category filter, price range filter, and sort
  - [x] 3.2 Implement GET /api/products/:id (returns 404 for inactive products to non-admins)
  - [x] 3.3 Build ProductsPage (catalog with search bar, filter sidebar, sort dropdown, pagination)
  - [x] 3.4 Build ProductDetailPage (images, description, price, stock, reviews average, add-to-cart button)
  - [x] 3.5 Build HomePage with featured products section (up to 8 featured items)

- [x] 4. Shopping Cart
  - [x] 4.1 Implement GET/POST /api/cart and PUT/DELETE /api/cart/:itemId with totals calculation
  - [x] 4.2 Build CartPage with item list, quantity controls, subtotal/tax/total display, and empty state
  - [x] 4.3 Implement CartContext and useCart hook; sync cart state with API on every mutation

- [x] 5. Wishlist
  - [x] 5.1 Implement GET/POST /api/wishlist and DELETE /api/wishlist/:productId
  - [x] 5.2 Build WishlistPage with product cards, remove button, and empty state

- [x] 6. User Profile and Address Management
  - [x] 6.1 Implement GET/PUT /api/profile and address CRUD endpoints
  - [x] 6.2 Build ProfilePage with profile edit form and address management (add, edit, delete, set default)

- [x] 7. Checkout and Orders
  - [x] 7.1 Implement POST /api/orders (checkout: validate cart, apply coupon, create order, decrement stock, clear cart)
  - [x] 7.2 Implement GET /api/orders and GET /api/orders/:id
  - [x] 7.3 Build CheckoutPage (address selector, order summary, coupon input, CoD payment, confirm button)
  - [x] 7.4 Build OrderHistoryPage (paginated list) and OrderDetailPage (status tracker, items, totals)

- [x] 8. Admin Panel
  - [x] 8.1 Implement GET /api/admin/dashboard (stats + 30-day daily revenue)
  - [x] 8.2 Implement admin product CRUD endpoints (POST/PUT/DELETE /api/products with Admin auth)
  - [x] 8.3 Implement admin category CRUD endpoints
  - [x] 8.4 Implement GET/PUT /api/admin/orders (paginated, status filter, status update)
  - [x] 8.5 Implement GET/PUT /api/admin/users (paginated list, role update, deactivate)
  - [x] 8.6 Implement coupon CRUD endpoints (GET/POST /api/admin/coupons, DELETE /api/admin/coupons/:id)
  - [x] 8.7 Build Admin DashboardPage (stat cards + revenue chart using a charting library)
  - [x] 8.8 Build Admin ProductsPage (table with create/edit/delete modals)
  - [x] 8.9 Build Admin CategoriesPage, OrdersPage, UsersPage, and CouponsPage (CRUD tables)

- [x] 9. Shared UI Components
  - [x] 9.1 Build Navbar (links to catalog, cart, wishlist, account; responsive hamburger menu) and Footer
  - [x] 9.2 Build Toast notification provider (useToast hook, success/error variants)
  - [x] 9.3 Build reusable Pagination, EmptyState, LoadingSpinner, and OrderStatusBadge components

- [x] 10. Property-Based and Unit Tests
  - [x] 10.1 Write property tests for P1 (password not in response) and P2 (registration validation)
  - [x] 10.2 Write property tests for P3, P4 (RBAC: unauth → 401, customer → 403 on admin routes)
  - [x] 10.3 Write property tests for P5, P6, P7, P8 (search, category filter, price filter, sort)
  - [x] 10.4 Write property tests for P9, P10 (cart totals, out-of-stock rejection)
  - [x] 10.5 Write property tests for P11, P12 (wishlist round-trip, wishlist fields)
  - [x] 10.6 Write property tests for P13, P14 (checkout side effects, invalid coupon)
  - [x] 10.7 Write property tests for P15, P16, P17 (order isolation, negative price/stock, category deletion)
  - [x] 10.8 Write property tests for P18, P19, P20 (order status filter, invalid status, deactivated login)
  - [x] 10.9 Write property tests for P21, P22 (coupon fields, dashboard revenue)
  - [x] 10.10 Write property tests for P23, P24 (validation error structure, API envelope)
  - [x] 10.11 Write unit tests for specific examples: duplicate email 409, valid login JWT fields, empty cart checkout 400, CoD sets Confirmed, forgot-password 200 on unknown email
