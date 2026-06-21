module.exports = {
  // Employee/User queries
  LIST_EMPLOYEES: `
    SELECT id, name, email, role, is_active, created_at 
    FROM users 
    WHERE is_deleted = 0
  `,
  LIST_EMPLOYEES_PAGED: `
    SELECT id, name, email, role, is_active, created_at
    FROM users
    WHERE is_deleted = 0
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `,
  COUNT_EMPLOYEES: `
    SELECT COUNT(*) AS total
    FROM users
    WHERE is_deleted = 0
  `,
  CREATE_EMPLOYEE: `
    INSERT INTO users (name, email, password, role, is_active, is_deleted) 
    VALUES (?, ?, ?, ?, 1, 0)
  `,
  UPDATE_EMPLOYEE: `
    UPDATE users 
    SET name = ?, email = ?, role = ?, is_active = ? 
    WHERE id = ? AND is_deleted = 0
  `,
  SOFT_DELETE_EMPLOYEE: `
    UPDATE users 
    SET is_deleted = 1 
    WHERE id = ?
  `,

  // Category queries
  LIST_CATEGORIES: `
    SELECT 
      c.*,
      COUNT(p.id) AS products_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.id DESC
  `,
  CREATE_CATEGORY: `
    INSERT INTO categories (name, color, is_active) 
    VALUES (?, ?, ?)
  `,
  UPDATE_CATEGORY: `
    UPDATE categories 
    SET name = ?, color = ?, is_active = ? 
    WHERE id = ?
  `,
  DELETE_CATEGORY: `
    DELETE FROM categories 
    WHERE id = ?
  `,

  // Product queries
  ENSURE_PRODUCT_IMAGE_COLUMN: `
    ALTER TABLE products 
    ADD COLUMN image_url VARCHAR(500) NULL
  `,
  LIST_PRODUCTS: `
    SELECT 
      p.*, 
      c.name AS category_name, 
      c.color AS category_color,
      COALESCE(sales.sold, 0) AS sold,
      COALESCE(sales.revenue, 0) AS revenue
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN (
      SELECT 
        oi.product_id,
        SUM(oi.quantity) AS sold,
        SUM(oi.line_total) AS revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('PAID', 'COMPLETED')
      GROUP BY oi.product_id
    ) sales ON sales.product_id = p.id
    ORDER BY p.id DESC
  `,
  LIST_PRODUCTS_PAGED: `
    SELECT
      p.*,
      c.name AS category_name,
      c.color AS category_color,
      COALESCE(sales.sold, 0) AS sold,
      COALESCE(sales.revenue, 0) AS revenue
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN (
      SELECT
        oi.product_id,
        SUM(oi.quantity) AS sold,
        SUM(oi.line_total) AS revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('PAID', 'COMPLETED')
      GROUP BY oi.product_id
    ) sales ON sales.product_id = p.id
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `,
  COUNT_PRODUCTS: `
    SELECT COUNT(*) AS total
    FROM products
  `,
  CREATE_PRODUCT: `
    INSERT INTO products (category_id, name, description, price, unit, tax_percentage, is_active, image_url) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  UPDATE_PRODUCT: `
    UPDATE products 
    SET category_id = ?, name = ?, description = ?, price = ?, unit = ?, tax_percentage = ?, is_active = ?, image_url = ? 
    WHERE id = ?
  `,
  DELETE_PRODUCT: `
    DELETE FROM products 
    WHERE id = ?
  `,

  // Floor queries
  LIST_FLOORS: `
    SELECT * FROM floors
  `,
  CREATE_FLOOR: `
    INSERT INTO floors (name) 
    VALUES (?)
  `,
  UPDATE_FLOOR: `
    UPDATE floors 
    SET name = ? 
    WHERE id = ?
  `,
  DELETE_FLOOR: `
    DELETE FROM floors 
    WHERE id = ?
  `,

  // Table queries
  ENSURE_TABLE_POS_STATUS_COLUMN: `
    ALTER TABLE cafe_tables
    ADD COLUMN pos_status VARCHAR(20) DEFAULT 'available'
  `,
  LIST_TABLES: `
    SELECT t.*, f.name AS floor_name,
      (SELECT o.id FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('PAID', 'CANCELLED') LIMIT 1) AS active_order_id,
      COALESCE(t.pos_status, CASE WHEN EXISTS(SELECT 1 FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('PAID', 'CANCELLED')) THEN 'active' ELSE 'available' END) AS pos_status,
      EXISTS(SELECT 1 FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('PAID', 'CANCELLED')) AS has_active_order
    FROM cafe_tables t
    JOIN floors f ON t.floor_id = f.id
  `,
  LIST_TABLES_BY_FLOOR: `
    SELECT t.*,
      (SELECT o.id FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('PAID', 'CANCELLED') LIMIT 1) AS active_order_id,
      COALESCE(t.pos_status, CASE WHEN EXISTS(SELECT 1 FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('PAID', 'CANCELLED')) THEN 'active' ELSE 'available' END) AS pos_status,
      EXISTS(SELECT 1 FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('PAID', 'CANCELLED')) AS has_active_order
    FROM cafe_tables t
    WHERE t.floor_id = ?
  `,
  CREATE_TABLE: `
    INSERT INTO cafe_tables (floor_id, table_number, seats, unique_token, is_active, pos_status) 
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  UPDATE_TABLE: `
    UPDATE cafe_tables 
    SET floor_id = ?, table_number = ?, seats = ?, is_active = ?, pos_status = ? 
    WHERE id = ?
  `,
  DELETE_TABLE: `
    DELETE FROM cafe_tables 
    WHERE id = ?
  `,
  FIND_TABLE_BY_TOKEN: `
    SELECT t.*, f.name AS floor_name 
    FROM cafe_tables t
    JOIN floors f ON t.floor_id = f.id
    WHERE t.unique_token = ?
  `,

  // System Settings queries
  GET_ALL_SETTINGS: `
    SELECT key_name, key_value FROM system_settings
  `,
  UPDATE_SETTING: `
    INSERT INTO system_settings (key_name, key_value) 
    VALUES (?, ?) 
    ON DUPLICATE KEY UPDATE key_value = ?
  `,

  // Employee Password & Archive queries
  UPDATE_EMPLOYEE_PASSWORD: `
    UPDATE users 
    SET password = ? 
    WHERE id = ? AND is_deleted = 0
  `,
  SET_EMPLOYEE_ACTIVE_STATUS: `
    UPDATE users 
    SET is_active = ? 
    WHERE id = ? AND is_deleted = 0
  `,

  // Payment Methods
  LIST_PAYMENT_METHODS: `
    SELECT 
      pm.*,
      COALESCE(stats.transactions_today, 0) AS transactions_today,
      COALESCE(stats.amount_today, 0) AS amount_today,
      COALESCE(stats.payment_status, 'NO_PAYMENT') AS payment_status
    FROM payment_methods pm
    LEFT JOIN (
      SELECT 
        CASE
          WHEN UPPER(payment_method) = 'RAZORPAY' THEN 'CARD'
          ELSE UPPER(payment_method)
        END AS method_key,
        COUNT(*) AS transactions_today,
        SUM(amount) AS amount_today,
        payment_status
      FROM payments
      WHERE payment_status = 'SUCCESS'
        AND DATE(created_at) = CURDATE()
      GROUP BY method_key, payment_status
    ) stats ON stats.method_key = CASE
      WHEN UPPER(pm.name) LIKE '%CASH%' THEN 'CASH'
      WHEN UPPER(pm.name) LIKE '%UPI%' THEN 'UPI'
      WHEN UPPER(pm.name) LIKE '%CARD%' OR UPPER(pm.name) LIKE '%DIGITAL%' THEN 'CARD'
      ELSE UPPER(pm.name)
    END
    ORDER BY pm.id ASC
  `,
  GET_PAYMENT_METHOD_BY_ID: `
    SELECT * FROM payment_methods
    WHERE id = ?
  `,
  UPDATE_PAYMENT_METHOD: `
    UPDATE payment_methods 
    SET is_enabled = ?, upi_id = ? 
    WHERE id = ?
  `,

  // Coupon queries
  LIST_COUPONS: `
    SELECT 
      c.*,
      COUNT(o.id) AS redemptions
    FROM coupons c
    LEFT JOIN orders o ON o.coupon_id = c.id AND o.status IN ('PAID', 'COMPLETED')
    GROUP BY c.id
    ORDER BY c.id DESC
  `,
  CREATE_COUPON: `
    INSERT INTO coupons (code, discount_type, discount_value, expiry_date, is_active) 
    VALUES (?, ?, ?, ?, ?)
  `,
  UPDATE_COUPON: `
    UPDATE coupons 
    SET code = ?, discount_type = ?, discount_value = ?, expiry_date = ?, is_active = ? 
    WHERE id = ?
  `,
  DELETE_COUPON: `
    DELETE FROM coupons 
    WHERE id = ?
  `,

  // Promotion queries
  ENSURE_PROMOTION_NAME_COLUMN: `
    ALTER TABLE promotions
    ADD COLUMN name VARCHAR(120) NULL
  `,
  LIST_PROMOTIONS: `
    SELECT 
      pr.*, 
      COALESCE(pr.name, CONCAT(pr.promotion_type, ' Promotion')) AS name,
      p.name AS product_name 
    FROM promotions pr
    LEFT JOIN products p ON pr.product_id = p.id
    ORDER BY pr.id DESC
  `,
  CREATE_PROMOTION: `
    INSERT INTO promotions (name, promotion_type, product_id, min_quantity, min_order_amount, discount_type, discount_value, is_active) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  UPDATE_PROMOTION: `
    UPDATE promotions 
    SET name = ?, promotion_type = ?, product_id = ?, min_quantity = ?, min_order_amount = ?, discount_type = ?, discount_value = ?, is_active = ? 
    WHERE id = ?
  `,
  DELETE_PROMOTION: `
    DELETE FROM promotions 
    WHERE id = ?
  `,

  // Report queries
  SALES_SUMMARY: `
    SELECT 
      COUNT(id) AS total_orders,
      COALESCE(SUM(subtotal), 0) AS total_subtotal,
      COALESCE(SUM(tax_amount), 0) AS total_tax,
      COALESCE(SUM(discount_amount), 0) AS total_discount,
      COALESCE(SUM(total_amount), 0) AS total_sales
    FROM orders 
    WHERE status = 'PAID'
  `,
  SALES_BY_DATE: `
    SELECT 
      DATE(created_at) AS order_date,
      COUNT(id) AS order_count,
      COALESCE(SUM(total_amount), 0) AS daily_sales
    FROM orders 
    WHERE status = 'PAID'
    GROUP BY DATE(created_at)
    ORDER BY order_date DESC
  `,
  SALES_BY_PRODUCT: `
    SELECT 
      p.id AS product_id,
      p.name AS product_name,
      c.name AS category_name,
      SUM(oi.quantity) AS total_quantity,
      SUM(oi.line_total) AS total_revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'PAID'
    GROUP BY p.id, p.name, c.name
    ORDER BY total_revenue DESC
  `,
  SESSIONS_REPORT: `
    SELECT 
      s.*, 
      u.name AS employee_name
    FROM pos_sessions s
    JOIN users u ON s.employee_id = u.id
    ORDER BY s.opening_time DESC
  `,

  LIST_POS_SESSIONS: `
    SELECT
      s.*,
      u.name AS employee_name,
      COUNT(DISTINCT o.id) AS orders_count,
      COALESCE(SUM(o.total_amount), 0) AS orders_total_amount,
      COALESCE(SUM(ps.cash_sales), 0) AS cash_sales,
      COALESCE(SUM(ps.upi_sales), 0) AS upi_sales,
      COALESCE(SUM(ps.card_sales), 0) AS card_sales,
      COALESCE(SUM(ps.total_sales), 0) AS total_sales
    FROM pos_sessions s
    JOIN users u ON s.employee_id = u.id
    LEFT JOIN orders o ON o.session_id = s.id
    LEFT JOIN (
      SELECT
        order_id,
        COALESCE(SUM(CASE WHEN UPPER(payment_method) = 'CASH' THEN amount ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN UPPER(payment_method) = 'UPI' THEN amount ELSE 0 END), 0) AS upi_sales,
        COALESCE(SUM(CASE WHEN UPPER(payment_method) IN ('CARD', 'RAZORPAY') THEN amount ELSE 0 END), 0) AS card_sales,
        COALESCE(SUM(CASE WHEN payment_status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS total_sales
      FROM payments
      WHERE payment_status = 'SUCCESS'
      GROUP BY order_id
    ) ps ON ps.order_id = o.id
    GROUP BY s.id, u.name
    ORDER BY s.opening_time DESC
  `
};
