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
  `
};
