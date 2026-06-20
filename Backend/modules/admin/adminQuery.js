module.exports = {
  // Employee/User queries
  LIST_EMPLOYEES: `
    SELECT id, name, email, role, is_active, created_at 
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
    SELECT * FROM categories 
    WHERE is_active = 1
  `,
  CREATE_CATEGORY: `
    INSERT INTO categories (name, color, is_active) 
    VALUES (?, ?, 1)
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
  LIST_PRODUCTS: `
    SELECT p.*, c.name AS category_name, c.color AS category_color 
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `,
  CREATE_PRODUCT: `
    INSERT INTO products (category_id, name, description, price, unit, tax_percentage, is_active) 
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `,
  UPDATE_PRODUCT: `
    UPDATE products 
    SET category_id = ?, name = ?, description = ?, price = ?, unit = ?, tax_percentage = ?, is_active = ? 
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
  LIST_TABLES: `
    SELECT t.*, f.name AS floor_name,
      (SELECT o.id FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('PAID', 'CANCELLED') LIMIT 1) AS active_order_id,
      EXISTS(SELECT 1 FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('PAID', 'CANCELLED')) AS has_active_order
    FROM cafe_tables t
    JOIN floors f ON t.floor_id = f.id
  `,
  LIST_TABLES_BY_FLOOR: `
    SELECT t.*,
      (SELECT o.id FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('PAID', 'CANCELLED') LIMIT 1) AS active_order_id,
      EXISTS(SELECT 1 FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('PAID', 'CANCELLED')) AS has_active_order
    FROM cafe_tables t
    WHERE t.floor_id = ?
  `,
  CREATE_TABLE: `
    INSERT INTO cafe_tables (floor_id, table_number, seats, unique_token, is_active) 
    VALUES (?, ?, ?, ?, ?)
  `,
  UPDATE_TABLE: `
    UPDATE cafe_tables 
    SET floor_id = ?, table_number = ?, seats = ?, is_active = ? 
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
    SELECT * FROM payment_methods
  `,
  UPDATE_PAYMENT_METHOD: `
    UPDATE payment_methods 
    SET is_enabled = ?, upi_id = ? 
    WHERE id = ?
  `,

  // Coupon queries
  LIST_COUPONS: `
    SELECT * FROM coupons
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
  LIST_PROMOTIONS: `
    SELECT pr.*, p.name AS product_name 
    FROM promotions pr
    LEFT JOIN products p ON pr.product_id = p.id
  `,
  CREATE_PROMOTION: `
    INSERT INTO promotions (promotion_type, product_id, min_quantity, min_order_amount, discount_type, discount_value, is_active) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
  UPDATE_PROMOTION: `
    UPDATE promotions 
    SET promotion_type = ?, product_id = ?, min_quantity = ?, min_order_amount = ?, discount_type = ?, discount_value = ?, is_active = ? 
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
  `
};
