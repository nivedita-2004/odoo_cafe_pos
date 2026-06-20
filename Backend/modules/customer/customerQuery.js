module.exports = {
  LIST_CUSTOMER_MENU: `
    SELECT p.*, c.name AS category_name, c.color AS category_color 
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1 AND c.is_active = 1
  `,

  GET_TABLE_DETAILS: `
    SELECT t.id, t.table_number, t.seats, t.unique_token, f.name AS floor_name
    FROM cafe_tables t
    JOIN floors f ON t.floor_id = f.id
    WHERE t.unique_token = ? AND t.is_active = 1
  `,

  GET_SYSTEM_SETTING: `
    SELECT key_value FROM system_settings 
    WHERE key_name = ?
  `,

  GET_ANY_ACTIVE_SESSION: `
    SELECT id, employee_id FROM pos_sessions 
    WHERE status = 'OPEN' 
    ORDER BY opening_time DESC 
    LIMIT 1
  `,

  CREATE_SELF_ORDER: `
    INSERT INTO orders (order_number, table_id, customer_id, session_id, employee_id, subtotal, tax_amount, discount_amount, total_amount, status) 
    VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'TO_COOK')
  `,

  GET_ACTIVE_ORDER_FOR_TABLE: `
    SELECT o.*, t.table_number, f.name AS floor_name
    FROM orders o
    JOIN cafe_tables t ON o.table_id = t.id
    JOIN floors f ON t.floor_id = f.id
    WHERE t.unique_token = ? AND o.status NOT IN ('PAID', 'CANCELLED')
    ORDER BY o.created_at DESC
    LIMIT 1
  `
};
