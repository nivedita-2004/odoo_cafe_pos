module.exports = {
  GET_ACTIVE_KITCHEN_ORDERS: `
    SELECT o.*, t.table_number, f.name AS floor_name, c.name AS customer_name
    FROM orders o
    JOIN cafe_tables t ON o.table_id = t.id
    JOIN floors f ON t.floor_id = f.id
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.status IN ('TO_COOK', 'PREPARING')
      OR (o.status = 'COMPLETED' AND o.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY))
    ORDER BY
      CASE o.status
        WHEN 'TO_COOK' THEN 1
        WHEN 'PREPARING' THEN 2
        WHEN 'COMPLETED' THEN 3
        ELSE 4
      END,
      o.created_at ASC
  `,

  GET_ORDER_ITEMS_WITH_PRODUCT: `
    SELECT oi.*, p.name AS product_name, p.description AS product_description
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `,

  GET_ITEMS_FOR_ORDERS: `
    SELECT oi.*, p.name AS product_name, p.description AS product_description
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id IN (?)
    ORDER BY oi.order_id ASC, oi.id ASC
  `,

  GET_ORDER_BY_ID: `
    SELECT o.*, t.table_number, f.name AS floor_name, c.name AS customer_name
    FROM orders o
    JOIN cafe_tables t ON o.table_id = t.id
    JOIN floors f ON t.floor_id = f.id
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `,

  UPDATE_ORDER_STATUS: `
    UPDATE orders 
    SET status = ? 
    WHERE id = ?
  `,

  UPDATE_ORDER_ITEMS_STATUS: `
    UPDATE order_items 
    SET status = ? 
    WHERE order_id = ? AND status = ?
  `,

  UPDATE_SINGLE_ITEM_STATUS: `
    UPDATE order_items 
    SET status = ? 
    WHERE id = ?
  `,

  GET_ORDER_ITEMS_STATUS: `
    SELECT status 
    FROM order_items 
    WHERE order_id = ?
  `,

  GET_ORDER_BY_ITEM_ID: `
    SELECT o.id, o.status, o.table_id
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.id = ?
  `
};
