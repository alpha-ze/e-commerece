# Requirements Document

## Introduction

A full-stack E-Commerce Web Application built with React (Frontend), Node.js + Express (Backend), and PostgreSQL (Database). The system supports two roles — Customer and Admin — and covers the full shopping lifecycle from browsing products to order fulfillment. The Admin Panel provides complete store management including products, categories, users, orders, and coupons.

## Glossary

- **System**: The full-stack E-Commerce Web Application
- **Auth_Service**: The service responsible for user registration, login, token issuance, and password management
- **Product_Service**: The service responsible for product CRUD, image management, and stock tracking
- **Cart_Service**: The service managing cart item additions, removals, quantity changes, and price calculations
- **Order_Service**: The service handling order creation, status transitions, and tracking
- **Admin_Service**: The service providing administrative dashboard, statistics, and management operations
- **API**: The RESTful HTTP API exposed by the Node.js/Express backend
- **UI**: The React-based frontend application
- **Customer**: An authenticated user with the "customer" role
- **Admin**: An authenticated user with the "admin" role
- **JWT**: JSON Web Token used for stateless authentication
- **Product**: A sellable item with name, description, category, price, images, and stock quantity
- **Category**: A named grouping for products
- **Cart**: A per-user collection of products and quantities pending checkout
- **Wishlist**: A per-user saved list of products
- **Order**: A confirmed purchase record containing one or more OrderItems
- **OrderItem**: A single product line within an Order
- **Coupon**: A discount code with a percentage or fixed value and expiry date
- **Address**: A saved shipping address belonging to a Customer

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a visitor, I want to register an account with my name, email, and password, so that I can shop and track my orders.

#### Acceptance Criteria

1. WHEN a visitor submits a registration form with a valid name, unique email, and password of at least 8 characters, THE Auth_Service SHALL create a new user record with role "customer" and return a JWT.
2. WHEN a visitor submits a registration form with an email that already exists in the database, THE Auth_Service SHALL return a 409 Conflict error with a descriptive message.
3. WHEN a visitor submits a registration form with a missing or invalid field, THE Auth_Service SHALL return a 400 Bad Request error listing the invalid fields.
4. THE Auth_Service SHALL hash passwords using bcrypt with a minimum cost factor of 10 before persisting them to the database.
5. THE Auth_Service SHALL never return the hashed password in any API response.

---

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in with my email and password, so that I can access my account and protected features.

#### Acceptance Criteria

1. WHEN a user submits valid credentials, THE Auth_Service SHALL return a signed JWT containing the user's id, email, and role with an expiry of 7 days.
2. WHEN a user submits an unrecognized email or an incorrect password, THE Auth_Service SHALL return a 401 Unauthorized error.
3. THE UI SHALL store the JWT in an httpOnly cookie or secure localStorage and include it in the Authorization header of subsequent API requests.
4. WHEN a user logs out, THE UI SHALL remove the stored JWT and redirect the user to the homepage.

---

### Requirement 3: Forgot Password

**User Story:** As a registered user, I want to reset my password via email, so that I can regain access if I forget it.

#### Acceptance Criteria

1. WHEN a user submits a valid registered email to the forgot-password endpoint, THE Auth_Service SHALL generate a time-limited reset token valid for 1 hour and send a reset link to that email.
2. WHEN a user submits a reset token that has expired or does not exist, THE Auth_Service SHALL return a 400 Bad Request error.
3. WHEN a user submits a valid reset token and a new password of at least 8 characters, THE Auth_Service SHALL hash the new password and update the user record, then invalidate the reset token.
4. IF the email address submitted to the forgot-password endpoint is not registered, THEN THE Auth_Service SHALL return a 200 OK response without revealing whether the email exists.

---

### Requirement 4: Role-Based Access Control

**User Story:** As a system operator, I want routes to be protected by role, so that Customers cannot access Admin operations and unauthenticated users cannot access protected resources.

#### Acceptance Criteria

1. WHILE a request carries no valid JWT, THE API SHALL reject requests to protected routes with a 401 Unauthorized error.
2. WHILE a request carries a valid JWT with role "customer", THE API SHALL reject requests to Admin-only routes with a 403 Forbidden error.
3. WHILE a request carries a valid JWT with role "admin", THE API SHALL permit access to all Admin-only routes.
4. THE API SHALL validate JWT signatures on every protected request using the application's secret key stored in an environment variable.

---

### Requirement 5: Product Catalog and Detail

**User Story:** As a Customer, I want to browse a product catalog and view product details, so that I can find and evaluate products before purchasing.

#### Acceptance Criteria

1. THE UI SHALL display a homepage with a section of featured products (up to 8 products marked as featured).
2. THE API SHALL expose a paginated product listing endpoint that returns products with name, category, price, discount price, primary image, and stock status.
3. WHEN a Customer requests a product detail page, THE UI SHALL display the product name, description, category, price, discount price, all images, stock quantity, and average review rating.
4. THE API SHALL return a 404 Not Found error when a requested product id does not exist or the product status is "inactive" and the requester is not an Admin.

---

### Requirement 6: Product Search and Filtering

**User Story:** As a Customer, I want to search, filter, and sort products, so that I can quickly find what I am looking for.

#### Acceptance Criteria

1. WHEN a Customer submits a search query, THE API SHALL return products whose name or description contains the query string (case-insensitive).
2. WHEN a Customer applies a category filter, THE API SHALL return only products belonging to the selected category.
3. WHEN a Customer applies a price range filter with a minimum and maximum value, THE API SHALL return only products whose effective price (discount price if set, otherwise price) falls within the specified range.
4. WHEN a Customer selects a sort order of "price_asc", "price_desc", "newest", or "popularity", THE API SHALL return products ordered accordingly.
5. THE API SHALL support combining search, category filter, price filter, and sort in a single request.

---

### Requirement 7: Shopping Cart

**User Story:** As a Customer, I want to manage a shopping cart, so that I can collect items and review them before checkout.

#### Acceptance Criteria

1. WHEN a Customer adds a product to the cart, THE Cart_Service SHALL create or increment the cart item record and return the updated cart.
2. WHEN a Customer adds a product whose stock quantity is 0, THE Cart_Service SHALL return a 400 Bad Request error indicating the product is out of stock.
3. WHEN a Customer updates the quantity of a cart item to a value greater than 0, THE Cart_Service SHALL update the record and return the updated cart.
4. WHEN a Customer updates the quantity of a cart item to 0, THE Cart_Service SHALL remove that item from the cart.
5. WHEN a Customer removes a cart item, THE Cart_Service SHALL delete the record and return the updated cart.
6. THE Cart_Service SHALL calculate and return the subtotal (sum of item price × quantity), tax (subtotal × applicable tax rate), and total (subtotal + tax) for the current cart.

---

### Requirement 8: Wishlist

**User Story:** As a Customer, I want to save products to a wishlist, so that I can revisit them later.

#### Acceptance Criteria

1. WHEN a Customer adds a product to the wishlist and it is not already present, THE System SHALL create a wishlist record and return the updated wishlist.
2. WHEN a Customer adds a product that is already in the wishlist, THE System SHALL return a 409 Conflict error.
3. WHEN a Customer removes a product from the wishlist, THE System SHALL delete the wishlist record and return the updated wishlist.
4. THE System SHALL return the full wishlist for a Customer on request, including product name, primary image, price, and discount price.

---

### Requirement 9: User Profile and Address Management

**User Story:** As a Customer, I want to manage my profile and saved addresses, so that I can keep my information up to date and speed up checkout.

#### Acceptance Criteria

1. WHEN a Customer submits updated profile information (name or email), THE System SHALL validate the input and persist the changes.
2. WHEN a Customer submits an email update that conflicts with an existing account, THE System SHALL return a 409 Conflict error.
3. WHEN a Customer adds a new address with street, city, state, postal code, and country, THE System SHALL persist the address and associate it with the Customer.
4. WHEN a Customer deletes an address, THE System SHALL remove the address record.
5. THE System SHALL allow a Customer to designate one address as the default shipping address.

---

### Requirement 10: Checkout and Order Creation

**User Story:** As a Customer, I want to complete a checkout by selecting a shipping address and payment method, so that I can place an order.

#### Acceptance Criteria

1. WHEN a Customer initiates checkout with a valid shipping address and at least one item in the cart, THE Order_Service SHALL create an Order record with status "Pending" and one OrderItem per cart item.
2. WHEN a Customer initiates checkout with an empty cart, THE Order_Service SHALL return a 400 Bad Request error.
3. WHEN a Customer selects "Cash on Delivery" as the payment method, THE Order_Service SHALL record the payment method and set the order status to "Confirmed".
4. WHEN a Customer applies a valid coupon code at checkout, THE Order_Service SHALL apply the coupon discount to the order total.
5. WHEN a Customer applies an expired or non-existent coupon code, THE Order_Service SHALL return a 400 Bad Request error.
6. WHEN an Order is successfully created, THE Order_Service SHALL decrement the stock quantity of each ordered product by the ordered quantity.
7. WHEN an Order is successfully created, THE Order_Service SHALL clear the Customer's cart.

---

### Requirement 11: Order Tracking and History

**User Story:** As a Customer, I want to view my order history and track the status of each order, so that I know when to expect delivery.

#### Acceptance Criteria

1. THE System SHALL return a paginated list of all Orders for the authenticated Customer, ordered by creation date descending.
2. WHEN a Customer requests a specific order, THE System SHALL return the Order details including status, OrderItems, shipping address, payment method, and totals.
3. THE UI SHALL display the current order status visually on the order tracking page using the sequence: Pending → Confirmed → Shipped → Delivered.
4. IF a Customer requests an order that does not belong to them, THEN THE System SHALL return a 403 Forbidden error.

---

### Requirement 12: Product Management (Admin)

**User Story:** As an Admin, I want to create, update, and delete products, so that I can keep the catalog accurate.

#### Acceptance Criteria

1. WHEN an Admin submits a new product with name, description, category id, price, stock quantity, and at least one image, THE Product_Service SHALL persist the product with status "active" and return the created record.
2. WHEN an Admin submits a product update, THE Product_Service SHALL validate the input and persist only the changed fields.
3. WHEN an Admin sets a product status to "inactive", THE Product_Service SHALL hide the product from Customer-facing catalog endpoints.
4. WHEN an Admin deletes a product, THE Product_Service SHALL remove the product record and all associated images.
5. IF an Admin submits a product with a negative price or negative stock quantity, THEN THE Product_Service SHALL return a 400 Bad Request error.

---

### Requirement 13: Category Management (Admin)

**User Story:** As an Admin, I want to manage product categories, so that products are organized correctly.

#### Acceptance Criteria

1. WHEN an Admin creates a category with a unique name, THE Admin_Service SHALL persist the category and return the created record.
2. WHEN an Admin attempts to create a category with a name that already exists, THE Admin_Service SHALL return a 409 Conflict error.
3. WHEN an Admin updates a category name, THE Admin_Service SHALL validate uniqueness and persist the change.
4. WHEN an Admin deletes a category that has no products assigned to it, THE Admin_Service SHALL remove the category record.
5. WHEN an Admin attempts to delete a category that has products assigned, THE Admin_Service SHALL return a 409 Conflict error.

---

### Requirement 14: Order Management (Admin)

**User Story:** As an Admin, I want to view and update order statuses, so that I can manage fulfillment.

#### Acceptance Criteria

1. THE Admin_Service SHALL return a paginated list of all Orders across all Customers, filterable by status.
2. WHEN an Admin updates an order status to a value within the sequence Pending → Confirmed → Shipped → Delivered → Cancelled, THE Admin_Service SHALL persist the new status.
3. IF an Admin submits an order status that is not one of Pending, Confirmed, Shipped, Delivered, or Cancelled, THEN THE Admin_Service SHALL return a 400 Bad Request error.

---

### Requirement 15: User Management (Admin)

**User Story:** As an Admin, I want to view and manage customer accounts, so that I can support users and enforce policies.

#### Acceptance Criteria

1. THE Admin_Service SHALL return a paginated list of all users with id, name, email, role, and account creation date.
2. WHEN an Admin updates a user's role, THE Admin_Service SHALL persist the change.
3. WHEN an Admin deactivates a user account, THE System SHALL reject login attempts from that account with a 403 Forbidden error.

---

### Requirement 16: Coupon Management (Admin)

**User Story:** As an Admin, I want to create and manage discount coupons, so that I can run promotions.

#### Acceptance Criteria

1. WHEN an Admin creates a coupon with a unique code, discount type (percentage or fixed), discount value, and expiry date, THE Admin_Service SHALL persist the coupon.
2. WHEN an Admin creates a coupon with a duplicate code, THE Admin_Service SHALL return a 409 Conflict error.
3. WHEN an Admin deletes a coupon, THE Admin_Service SHALL remove the coupon record.
4. THE Admin_Service SHALL return a list of all coupons with their code, type, value, expiry date, and active status.

---

### Requirement 17: Admin Dashboard Statistics

**User Story:** As an Admin, I want to see summary statistics and a revenue chart, so that I can monitor store performance.

#### Acceptance Criteria

1. THE Admin_Service SHALL return the total number of orders, total number of customers, and total revenue (sum of totals for Delivered orders).
2. THE Admin_Service SHALL return daily revenue totals for the last 30 days to populate a revenue chart.
3. THE UI SHALL render the revenue data as a chart on the Admin dashboard.

---

### Requirement 18: API Design and Validation

**User Story:** As a developer, I want a consistent, well-validated RESTful API, so that integrations are reliable and errors are easy to diagnose.

#### Acceptance Criteria

1. THE API SHALL follow RESTful conventions: GET for retrieval, POST for creation, PUT/PATCH for updates, DELETE for removal.
2. WHEN the API receives a request body that fails schema validation, THE API SHALL return a 400 Bad Request error with a structured list of validation errors.
3. THE API SHALL return responses in JSON format with a consistent envelope containing at least a "success" boolean and a "data" or "error" field.
4. THE API SHALL use parameterized queries or an ORM with parameterized query support to prevent SQL injection.

---

### Requirement 19: Security

**User Story:** As a system operator, I want the application to follow security best practices, so that user data and system integrity are protected.

#### Acceptance Criteria

1. THE System SHALL configure CORS to allow requests only from the allowed frontend origin specified in an environment variable.
2. THE System SHALL load all secrets (JWT secret, database credentials, SMTP credentials) from environment variables and never hard-code them in source files.
3. THE Auth_Service SHALL hash passwords using bcrypt before storage and SHALL NOT store or log plaintext passwords.
4. THE API SHALL apply rate limiting of 100 requests per 15-minute window per IP address on authentication endpoints.

---

### Requirement 20: UI/UX Standards

**User Story:** As a Customer, I want a modern, responsive interface with clear feedback, so that shopping is intuitive on any device.

#### Acceptance Criteria

1. THE UI SHALL be fully responsive and usable on viewport widths from 320px to 1920px.
2. THE UI SHALL display a loading indicator during any API request that takes longer than 300ms.
3. THE UI SHALL display a toast notification on successful or failed user actions (add to cart, place order, profile update, etc.).
4. THE UI SHALL display an empty-state message when a list (cart, wishlist, orders, search results) contains no items.
5. THE UI SHALL display paginated controls for any list that may exceed 20 items.
6. THE UI SHALL include a persistent Navbar with links to the catalog, cart, wishlist, and user account, and a Footer with store information.
Build a full-stack E-Commerce Web Application using React (Frontend), Node.js + Express (Backend), and PostgreSQL (Database).

Requirements:

AUTHENTICATION
- User registration with name, email, and password.
- Passwords must be hashed using bcrypt.
- User login using JWT authentication.
- Protected routes using JWT middleware.
- Forgot password functionality.
- Logout functionality.
- Store JWT securely.
- Role-based access control (Admin and Customer).

CUSTOMER FEATURES
- Responsive homepage with featured products.
- Product catalog page.
- Product details page.
- Product search.
- Category filtering.
- Price filtering.
- Sorting (price, newest, popularity).
- Shopping cart functionality.
- Wishlist functionality.
- User profile page.
- Address management.
- Order history page.

PRODUCT MANAGEMENT
- Product name.
- Description.
- Category.
- Price.
- Discount price.
- Stock quantity.
- Multiple product images.
- Product status (active/inactive).

SHOPPING CART
- Add to cart.
- Remove from cart.
- Update quantity.
- Calculate subtotal, tax, and total.

CHECKOUT
- Shipping address selection.
- Order summary.
- Payment integration structure.
- Cash on Delivery option.
- Order confirmation page.

ORDER MANAGEMENT
- Create order after successful checkout.
- Order statuses:
  - Pending
  - Confirmed
  - Shipped
  - Delivered
  - Cancelled
- Order tracking page.

ADMIN PANEL
- Admin dashboard.
- Total sales statistics.
- Total orders.
- Total customers.
- Revenue chart.
- Product CRUD operations.
- Category CRUD operations.
- User management.
- Order management.
- Coupon management.

DATABASE TABLES
Users
Products
Categories
Cart
Wishlist
Addresses
Orders
OrderItems
Payments
Reviews
Coupons

API REQUIREMENTS
- RESTful API design.
- Proper validation.
- Error handling.
- Authentication middleware.
- Authorization middleware.

SECURITY
- bcrypt password hashing.
- JWT authentication.
- Input validation.
- SQL injection prevention.
- CORS configuration.
- Environment variables.

UI REQUIREMENTS
- Modern professional design.
- Mobile responsive.
- Navbar.
- Footer.
- Loading states.
- Toast notifications.
- Empty states.
- Pagination.

TECH STACK
Frontend:
- React
- React Router
- Axios
- Tailwind CSS

Backend:
- Node.js
- Express.js

Database:
- PostgreSQL

Authentication:
- JWT
- bcrypt

Generate:
1. Complete project structure.
2. Database schema.
3. Backend APIs.
4. Frontend pages.
5. Authentication system.
6. Admin dashboard.
7. SQL table creation scripts.
8. Sample seed data.
9. Environment variable setup.
10. Docker configuration for deployment.

Code should follow industry best practices and be production-ready.