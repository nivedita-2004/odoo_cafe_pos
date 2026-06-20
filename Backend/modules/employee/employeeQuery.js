module.exports = {
  // Session queries
  GET_ACTIVE_SESSION: `
    SELECT * FROM pos_sessions 
    WHERE employee_id = ? AND status = 'OPEN' 
    LIMIT 1
  `,
  OPEN_SESSION: `
    INSERT INTO pos_sessions (employee_id, opening_time, opening_amount, status) 
    VALUES (?, NOW(), ?, 'OPEN')
  `,
  CLOSE_SESSION: `
    UPDATE pos_sessions 
    SET closing_time = NOW(), closing_amount = ?, status = 'CLOSED' 
    WHERE id = ?
  `,
  GET_SESSION_TOTAL_SALES: `
    SELECT COALESCE(SUM(total_amount), 0) AS total_sales 
    FROM orders 
    WHERE session_id = ? AND status = 'PAID'
  `,
  GET_LAST_SESSION: `
    SELECT opening_time, closing_amount, status 
    FROM pos_sessions 
    WHERE employee_id = ? 
    ORDER BY opening_time DESC 
    LIMIT 1
  `,

  // Customer queries
  SEARCH_CUSTOMERS: `
    SELECT * FROM customers 
    WHERE (phone LIKE ? OR email LIKE ? OR name LIKE ?) AND is_deleted = 0
  `,
  CREATE_CUSTOMER: `
    INSERT INTO customers (name, email, phone) 
    VALUES (?, ?, ?)
  `,
  UPDATE_CUSTOMER: `
    UPDATE customers
    SET name = ?, email = ?, phone = ?
    WHERE id = ? AND is_deleted = 0
  `,
  SOFT_DELETE_CUSTOMER: `
    UPDATE customers
    SET is_deleted = 1
    WHERE id = ?
  `,

  // Order Calculations helper queries
  GET_PRODUCT_FOR_CALC: `
    SELECT id, price, tax_percentage 
    FROM products 
    WHERE id = ? AND is_active = 1
  `,
  GET_ACTIVE_COUPON: `
    SELECT * FROM coupons 
    WHERE code = ? AND is_active = 1 AND (expiry_date IS NULL OR expiry_date >= CURDATE())
  `,
  GET_ACTIVE_PRODUCT_PROMOTIONS: `
    SELECT * FROM promotions 
    WHERE promotion_type = 'PRODUCT' AND product_id = ? AND is_active = 1
  `,
  GET_ACTIVE_ORDER_PROMOTIONS: `
    SELECT * FROM promotions 
    WHERE promotion_type = 'ORDER' AND is_active = 1
  `,

  // Order CRUD
  LIST_ORDERS: `
    SELECT o.*, t.table_number, f.name AS floor_name, u.name AS employee_name
    FROM orders o
    JOIN cafe_tables t ON o.table_id = t.id
    JOIN floors f ON t.floor_id = f.id
    JOIN users u ON o.employee_id = u.id
    WHERE o.status LIKE ?
    ORDER BY o.created_at DESC
  `,
  CREATE_ORDER: `
    INSERT INTO orders (order_number, table_id, customer_id, session_id, employee_id, coupon_id, subtotal, tax_amount, discount_amount, total_amount, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')
  `,
  CREATE_ORDER_ITEM: `
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, tax_amount, discount_amount, line_total, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, 'TO_COOK')
  `,
  GET_ORDER: `
    SELECT o.*, t.table_number, f.name AS floor_name, c.name AS customer_name, c.phone AS customer_phone
    FROM orders o
    JOIN cafe_tables t ON o.table_id = t.id
    JOIN floors f ON t.floor_id = f.id
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `,
  GET_ORDER_ITEMS: `
    SELECT oi.*, p.name AS product_name 
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `,
  UPDATE_ORDER_TOTALS: `
    UPDATE orders 
    SET subtotal = ?, tax_amount = ?, discount_amount = ?, total_amount = ? 
    WHERE id = ?
  `,
  UPDATE_ORDER_STATUS: `
    UPDATE orders 
    SET status = ? 
    WHERE id = ?
  `,
  DELETE_ORDER_ITEMS: `
    DELETE FROM order_items 
    WHERE order_id = ?
  `,
  UPDATE_ORDER_ITEMS_STATUS: `
    UPDATE order_items 
    SET status = ? 
    WHERE order_id = ?
  `,

  // Payments
  RECORD_PAYMENT: `
    INSERT INTO payments (order_id, payment_method, transaction_reference, amount, payment_status) 
    VALUES (?, ?, ?, ?, 'SUCCESS')
  `,
  GET_PAYMENTS_FOR_ORDER: `
    SELECT * FROM payments 
    WHERE order_id = ?
  `,
  GET_UPI_PAYMENT_METHOD: `
    SELECT * FROM payment_methods 
    WHERE name = 'UPI' AND is_enabled = 1 
    LIMIT 1
  `
};
