const { pool } = require("../../config/db");
const kdsQueries = require("./kdsQuery");
const socketService = require("../../sockets/socketService");

async function listKitchenOrders(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [orders] = await connection.query(kdsQueries.GET_ACTIVE_KITCHEN_ORDERS);
    
    // Fetch items for each active order
    for (const order of orders) {
      const [items] = await connection.query(kdsQueries.GET_ORDER_ITEMS_WITH_PRODUCT, [order.id]);
      order.items = items;
    }

    res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function getKitchenOrderDetail(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    const [orders] = await connection.query(kdsQueries.GET_ORDER_BY_ID, [id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const order = orders[0];
    const [items] = await connection.query(kdsQueries.GET_ORDER_ITEMS_WITH_PRODUCT, [id]);
    order.items = items;

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function startKitchenOrder(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [orders] = await connection.query("SELECT status FROM orders WHERE id = ?", [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orders[0];
    if (order.status !== "TO_COOK") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Only TO_COOK orders can be started (Current status: ${order.status})` });
    }

    // Update order status to PREPARING
    await connection.query(kdsQueries.UPDATE_ORDER_STATUS, ["PREPARING", id]);
    // Update order items in TO_COOK state to PREPARING
    await connection.query(kdsQueries.UPDATE_ORDER_ITEMS_STATUS, ["PREPARING", id, "TO_COOK"]);

    await connection.commit();

    // Emit Socket updates
    socketService.notifyOrderStatusToPOS({ orderId: parseInt(id), status: "PREPARING" });

    res.status(200).json({ success: true, message: "Order preparation started" });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function completeKitchenOrder(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [orders] = await connection.query("SELECT status, table_id FROM orders WHERE id = ?", [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orders[0];
    if (order.status !== "PREPARING" && order.status !== "TO_COOK") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Only cooking orders can be completed (Current status: ${order.status})` });
    }

    // Update order status to COMPLETED
    await connection.query(kdsQueries.UPDATE_ORDER_STATUS, ["COMPLETED", id]);
    // Update all non-completed items to COMPLETED
    await connection.query(kdsQueries.UPDATE_ORDER_ITEMS_STATUS, ["COMPLETED", id, "TO_COOK"]);
    await connection.query(kdsQueries.UPDATE_ORDER_ITEMS_STATUS, ["COMPLETED", id, "PREPARING"]);

    await connection.commit();

    // Emit Socket updates
    socketService.notifyOrderStatusToPOS({ orderId: parseInt(id), status: "COMPLETED" });

    res.status(200).json({ success: true, message: "Order preparation completed" });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function completeKitchenItem(req, res, next) {
  const { id } = req.params; // order item id
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Find parent order
    const [orders] = await connection.query(kdsQueries.GET_ORDER_BY_ITEM_ID, [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Order item not found" });
    }

    const order = orders[0];

    // Update item status to COMPLETED
    await connection.query(kdsQueries.UPDATE_SINGLE_ITEM_STATUS, ["COMPLETED", id]);

    // Check if all other items under this order are completed
    const [items] = await connection.query(kdsQueries.GET_ORDER_ITEMS_STATUS, [order.id]);
    const allCompleted = items.every(item => item.status === "COMPLETED");

    if (allCompleted) {
      // Transition order status to COMPLETED
      await connection.query(kdsQueries.UPDATE_ORDER_STATUS, ["COMPLETED", order.id]);
    }

    await connection.commit();

    // Emit Socket updates
    socketService.notifyItemStatusToPOS({ itemId: parseInt(id), status: "COMPLETED" });
    if (allCompleted) {
      socketService.notifyOrderStatusToPOS({ orderId: order.id, status: "COMPLETED" });
    }

    res.status(200).json({
      success: true,
      message: "Order item completed successfully",
      all_items_completed: allCompleted
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  listKitchenOrders,
  getKitchenOrderDetail,
  startKitchenOrder,
  completeKitchenOrder,
  completeKitchenItem
};
