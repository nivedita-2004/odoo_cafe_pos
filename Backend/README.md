# Odoo Cafe Point-of-Sale (POS) Backend

A complete, high-performance web-based POS and Kitchen Display System (KDS) backend built with Node.js, Express, MySQL, and Socket.io. Features role-based access control, automated discount engines, dynamic UPI payment QR code generation, thermal PDF receipt creation, and comprehensive reporting (Excel & PDF exports).

---

## 🛠️ Technology Stack
- **Runtime Environment:** Node.js (CommonJS)
- **Framework:** Express.js (v5.2.x)
- **Database:** MySQL 8.x (using `mysql2/promise` pool connection)
- **Real-time Layer:** Socket.io (v4.8.x)
- **Security:** Helmet, CORS, Express Rate Limiting, HTTP Parameter Pollution (hpp), custom XSS sanitization
- **Reporting & File Engines:** PDFKit (PDF receipts/sales report), ExcelJS (Excel report)
- **QR Generation:** QRCode

---

## ⚙️ Environment Variables (`.env`)

Configure the following variables in the `Backend/.env` file:
```env
NODE_ENV=development
PORT=5000

# MySQL Database Configurations
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=odoo_cafe_pos

# JWT Configurations
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Nodemailer SMTP Configurations (Optional - falls back to server console log in development)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Frontend Endpoint (for CORS and Table QR Code bindings)
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Getting Started

### 1. Install Dependencies
Navigate to the `Backend` directory and run:
```bash
npm install
```

### 2. Database Initialization
Run the database setup script to create the database, import tables from SQL dumps, seed default payment methods, and apply migrations (adding `product_id` to the `promotions` table):
```bash
node "../.gemini/antigravity-ide/brain/531ca33b-1788-43ee-bb71-3cd5c33e796e/scratch/setupDb.js"
```
*(If running on a separate machine, run the setup manually by importing all files in `Backend/Dump20260620` and running `ALTER TABLE promotions ADD COLUMN product_id bigint unsigned DEFAULT NULL;`)*

### 3. Run the Server
- **Development Mode (with Nodemon):**
  ```bash
  npm run dev
  ```
- **Production Mode:**
  ```bash
  npm start
  ```

---

## 🔌 API Documentation

### 🔒 Authentication Module (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/signup` | Signup a new administrator account (`name`, `email`, `password`) | No |
| **POST** | `/login` | Log in cashier/admin (`email`, `password`) - returns access/refresh tokens | No |
| **POST** | `/refresh` | Rotate tokens using a long-lived refresh token (`refreshToken`) | No |
| **POST** | `/forgot-password` | Request a 6-digit password reset OTP to email (logs to console in dev) | No |
| **POST** | `/verify-otp` | Verify the OTP code sent to user email | No |
| **POST** | `/reset-password` | Set a new password after successful OTP verification | No |
| **POST** | `/logout` | Log out and invalidate local session cookies | Yes |

---

### 🛡️ Admin Configurations Module (`/api/admin`)
*(All endpoints require `Authorization: Bearer <accessToken>` and user role `ADMIN`)*

#### Employees & Accounts
- `GET /employees` - List all accounts (excluding deleted ones)
- `POST /employees` - Create a new cashier account (`name`, `email`, `password`, `role`)
- `PUT /employees/:id` - Update name, email, role, or active status
- `DELETE /employees/:id` - Soft-delete employee account
- `PUT /employees/:id/password` - Update employee account password
- `PUT /employees/:id/archive` - Activate / Archive employee account status

#### Category & Products
- `GET /categories` | `POST /categories` | `PUT /categories/:id` | `DELETE /categories/:id` - Manage product categories (Name, Color)
- `GET /products` | `POST /products` | `PUT /products/:id` | `DELETE /products/:id` - Manage products (Name, category, price, tax, etc.)
  - *Note:* Product endpoints support **on-the-fly category generation**. If you omit `category_id` and pass `category_name` and `category_color`, the category will be generated automatically.

#### Floors & Tables Floorplan
- `GET /floors` | `POST /floors` | `PUT /floors/:id` | `DELETE /floors/:id` - Manage floors (Ground, First Floor, Rooftop)
- `GET /tables` | `POST /tables` | `PUT /tables/:id` | `DELETE /tables/:id` - Manage cafe tables under floors
- `GET /tables/:token/qr` - Generate dynamic Base64 QR Code redirecting to customer digital menu.

#### Sales Reporting & Exports
- `GET /reports/sales` - Get overall sales summary, date-wise statistics, top products, and POS sessions. Supports advanced filtering via query parameters: `period` (today/week/month/custom), `startDate`, `endDate`, `employee_id`, `session_id`, `product_id`.
- `GET /reports/export/excel` - Download full workbook of sales reports with custom filters
- `GET /reports/export/pdf` - Download clean sales report in PDF format with custom filters

#### System Settings
- `GET /settings` - Retrieve all configuration key-value pairs (e.g. self ordering toggles, modes, restaurant details)
- `PUT /settings` - Bulk update system configurations
- `POST /settings/upload` - Upload a POS background image (stores in `/uploads`, yields static file path)

---

### 💵 Cashier & POS Terminal Module (`/api/employee`)
*(All endpoints require `Authorization: Bearer <accessToken>` and role `EMPLOYEE` or `ADMIN`)*

#### Cashier Shifts (Sessions)
- `GET /sessions/active` - Get currently active shift details
- `GET /sessions/last` - Get last closed session details for shift landing metrics
- `POST /sessions/open` - Start shift with initial cash amount (`opening_amount`)
- `POST /sessions/:id/close` - End shift with closing cash (`closing_amount`). Reports expected sales vs. actual cash discrepancy.

#### Customer Registry
- `GET /customers?query=xxx` - Query customer directory by name, phone, or email
- `POST /customers` - Create customer record (`name`, `email`, `phone`)

#### Order Management & Checkout
- `GET /orders` - Fetch all orders (supports filtering by `status` query string)
- `POST /orders` - Place order draft. Automatically calculates subtotals, active **Product promotions** (minimum quantities), **Order promotions** (minimum totals), coupon codes, and item taxes.
- `GET /orders/:id` - Get detail of an order with item lists
- `PUT /orders/:id` - Modify order items (re-evaluates prices, discounts, and taxes)
- `PUT /orders/:id/status` - Transition order status (`DRAFT`, `TO_COOK`, `PREPARING`, `COMPLETED`, `PAID`, `CANCELLED`). *Transitions to kitchen stages trigger Socket.io broadcasts to the Kitchen Display (KDS).*
- `GET /orders/:id/upi-qr` - Parse UPI payments string and generate Base64 payment QR Code dynamically
- `POST /orders/:id/pay` - Record checkout payments (`CASH`, `CARD`, `UPI`). Automatically updates status to `PAID` and sends an optional receipt to customer email.
- `GET /orders/:id/receipt` - Stream a beautifully designed thermal paper PDF receipt directly to the browser.

---

### 🍽️ Customer Public Module (`/api/customer`)
*(No auth required for contactless dining)*
- `GET /menu` - View category-wise product listings and descriptions
- `GET /s/:token` - Retrieve table number, capacity, floor details, and POS system configurations by scanning the table token
- `POST /orders` - Place a guest self-order directly under the table token (adds order to POS KDS stream in status `TO_COOK`)
- `GET /orders/:id/status` - Track order cooking progress status from customer screen

---

## 📡 Socket.io Real-time Channels

Real-time events sync POS cashier terminals, Kitchen KDS, and customer displays:

### 📥 Rooms
- **`kitchen`:** Join to receive cooking orders sent from POS/Guest.
- **`posTerminal`:** Join to receive order progress notifications.
- **`customerDisplay`:** Join to sync Customer Display screens in real time.

### 📤 Events Sent & Received
- `kitchen:newOrder` / `kitchen:orderUpdated` - Sent to KDS when order is updated to `TO_COOK`.
- `pos:itemStatusUpdated` / `pos:orderStatusUpdated` - Sent to POS cashiers when kitchen cooks update dishes.
- `pos:cartUpdated` - Broadcasts cart additions to the customer display.
- `pos:proceedToPayment` - Prompts customer display screen to show the UPI Payment QR.
- `pos:paymentCompleted` - Signals customer display of a successful checkout.

---

## 🧪 Testing and Verification
Run the integrated testing script to verify all REST endpoints:
```bash
$env:NODE_PATH="c:\Users\Abhinav Singh\OneDrive\Desktop\Backend_odoo\Backend\node_modules"; node "../.gemini/antigravity-ide/brain/531ca33b-1788-43ee-bb71-3cd5c33e796e/scratch/test_api.js"
```
The test verifies 15 individual phases, asserting exact mathematical calculations for subtotals, promotions, dynamic UPI QR generation, discrepancy computation, user actions, guest self-ordering, socket triggers, and reports filtering.
