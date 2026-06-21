module.exports = {
  GET_DASHBOARD_STATS: `
    SELECT 
      COUNT(id) AS totalOrders,
      COALESCE(SUM(total_amount), 0) AS totalRevenue,
      COALESCE(AVG(total_amount), 0) AS averageOrderValue
    FROM orders
    WHERE status IN ('PAID', 'COMPLETED')
  `,

  GET_TOP_PRODUCTS: `
    SELECT 
      p.id AS product_id,
      p.name AS product_name,
      SUM(oi.quantity) AS quantity_sold,
      SUM(oi.line_total) AS revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('PAID', 'COMPLETED')
    GROUP BY p.id, p.name
    ORDER BY quantity_sold DESC
    LIMIT ?
  `,

  GET_TOP_CATEGORIES: `
    SELECT 
      c.id AS category_id,
      c.name AS category_name,
      SUM(oi.line_total) AS revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('PAID', 'COMPLETED')
    GROUP BY c.id, c.name
    ORDER BY revenue DESC
  `,

  GET_TOP_ORDERS: `
    SELECT 
      o.id AS order_id,
      o.order_number,
      o.total_amount,
      o.status,
      o.created_at,
      c.name AS customer_name,
      t.table_number
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN cafe_tables t ON o.table_id = t.id
    WHERE o.status IN ('PAID', 'COMPLETED')
    ORDER BY o.total_amount DESC
    LIMIT ?
  `,

  GET_SALES_TREND: `
    SELECT 
      DATE(created_at) AS date,
      COUNT(id) AS order_count,
      SUM(total_amount) AS revenue
    FROM orders
    WHERE status IN ('PAID', 'COMPLETED')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `,

  ADMIN_DASHBOARD_SUMMARY: `
    SELECT
      (SELECT COUNT(*) FROM orders WHERE status IN ('PAID', 'COMPLETED')) AS totalOrders,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ('PAID', 'COMPLETED')) AS totalRevenue,
      (SELECT COALESCE(AVG(total_amount), 0) FROM orders WHERE status IN ('PAID', 'COMPLETED')) AS averageOrderValue,
      (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()) AS todaysOrders,
      (SELECT COUNT(*) FROM orders WHERE status IN ('TO_COOK', 'PREPARING')) AS pendingKitchenOrders,
      (SELECT COUNT(DISTINCT table_id) FROM orders WHERE table_id IS NOT NULL AND status NOT IN ('PAID', 'COMPLETED', 'CANCELLED')) AS activeTables,
      (SELECT COUNT(*) FROM products WHERE is_active = 1) AS totalProducts,
      (SELECT COUNT(*) FROM users WHERE role = 'EMPLOYEE' AND is_active = 1 AND is_deleted = 0) AS activeEmployees
  `,

  ADMIN_DASHBOARD_SALES_TREND: `
    SELECT
      DATE_FORMAT(created_at, '%W') AS day,
      DATE(created_at) AS order_date,
      COALESCE(SUM(total_amount), 0) AS amount
    FROM orders
    WHERE status IN ('PAID', 'COMPLETED')
      AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(created_at), DATE_FORMAT(created_at, '%W')
    ORDER BY order_date ASC
  `,

  ADMIN_DASHBOARD_PAYMENT_SUMMARY: `
    SELECT
      UPPER(payment_method) AS label,
      COALESCE(SUM(amount), 0) AS amount
    FROM payments
    WHERE payment_status = 'SUCCESS'
    GROUP BY UPPER(payment_method)
  `,

  ADMIN_DASHBOARD_TOP_PRODUCTS: `
    SELECT
      p.name AS name,
      c.name AS category,
      COALESCE(SUM(oi.quantity), 0) AS quantity,
      COALESCE(SUM(oi.line_total), 0) AS revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('PAID', 'COMPLETED')
    GROUP BY p.id, p.name, c.name
    ORDER BY revenue DESC
    LIMIT 5
  `,

  ADMIN_DASHBOARD_TOP_CATEGORIES: `
    SELECT
      c.name AS category,
      c.color AS color,
      COALESCE(SUM(oi.line_total), 0) AS revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('PAID', 'COMPLETED')
    GROUP BY c.id, c.name, c.color
    ORDER BY revenue DESC
    LIMIT 5
  `,

  ADMIN_DASHBOARD_RECENT_ORDERS: `
    SELECT
      o.order_number AS orderNo,
      t.table_number AS tableNumber,
      c.name AS customer,
      u.name AS employee,
      o.total_amount AS amount,
      p.payment_method AS paymentMethod,
      o.status,
      o.created_at AS createdAt
    FROM orders o
    LEFT JOIN cafe_tables t ON o.table_id = t.id
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.employee_id = u.id
    LEFT JOIN payments p ON p.order_id = o.id
    ORDER BY o.created_at DESC
    LIMIT 8
  `,

  ADMIN_DASHBOARD_KITCHEN_STATUS: `
    SELECT status, COUNT(*) AS value
    FROM orders
    WHERE status IN ('TO_COOK', 'PREPARING', 'COMPLETED')
    GROUP BY status
  `,

  ADMIN_DASHBOARD_TABLE_OCCUPANCY: `
    SELECT
      COUNT(*) AS totalTables,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeTables,
      (
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) -
        (SELECT COUNT(DISTINCT table_id) FROM orders WHERE table_id IS NOT NULL AND status NOT IN ('PAID', 'COMPLETED', 'CANCELLED'))
      ) AS availableTables
    FROM cafe_tables
  `
};
