const { pool } = require("../../config/db");
const customerQueries = require("./customerQuery");
const employeeQueries = require("../employee/employeeQuery");
const { calculateOrderDetails } = require("../employee/employeeController");


async function getCustomerMenu(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [products] = await connection.query(customerQueries.LIST_CUSTOMER_MENU);
    
    const menu = {};
    products.forEach(p => {
      const catName = p.category_name;
      if (!menu[catName]) {
        menu[catName] = {
          category_name: catName,
          category_color: p.category_color,
          items: []
        };
      }
      menu[catName].items.push({
        id: p.id,
        name: p.name,
        description: p.description,
        price: parseFloat(p.price),
        unit: p.unit,
        tax_percentage: parseFloat(p.tax_percentage)
      });
    });

    res.status(200).json({ success: true, menu: Object.values(menu) });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}


async function getTableDetails(req, res, next) {
  const { token } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    const [tables] = await connection.query(customerQueries.GET_TABLE_DETAILS, [token]);
    if (tables.length === 0) {
      return res.status(404).json({ success: false, message: "Table not found or deactivated" });
    }

   
    const [rows] = await connection.query(customerQueries.GET_SYSTEM_SETTING, ["self_ordering_enabled"]);
    const [modeRows] = await connection.query(customerQueries.GET_SYSTEM_SETTING, ["self_ordering_mode"]);
    const [colorRows] = await connection.query(customerQueries.GET_SYSTEM_SETTING, ["background_color"]);
    const [bgImageRows] = await connection.query(customerQueries.GET_SYSTEM_SETTING, ["background_image"]);

    const settings = {
      self_ordering_enabled: rows[0]?.key_value === "1",
      self_ordering_mode: modeRows[0]?.key_value || "QR_MENU",
      background_color: colorRows[0]?.key_value || "#FFFFFF",
      background_image: bgImageRows[0]?.key_value || ""
    };

    res.status(200).json({ 
      success: true, 
      table: tables[0],
      settings 
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}


async function placeSelfOrder(req, res, next) {
  const { table_token, items, coupon_code } = req.body;

  if (!table_token || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "Table token and items are required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    
    const [enabledRow] = await connection.query(customerQueries.GET_SYSTEM_SETTING, ["self_ordering_enabled"]);
    if (!enabledRow[0] || enabledRow[0].key_value !== "1") {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Self-Ordering is currently disabled by administrator." });
    }

    const [modeRow] = await connection.query(customerQueries.GET_SYSTEM_SETTING, ["self_ordering_mode"]);
    if (!modeRow[0] || modeRow[0].key_value !== "ONLINE_ORDERING") {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Self-Ordering is in Menu-Only mode. Please order via cashier." });
    }

    
    const [tables] = await connection.query(customerQueries.GET_TABLE_DETAILS, [table_token]);
    if (tables.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Invalid table token" });
    }
    const table = tables[0];

  
    const [sessions] = await connection.query(customerQueries.GET_ANY_ACTIVE_SESSION);
    if (sessions.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Cafe is currently closed (no active POS cashier session)." });
    }
    const session = sessions[0];

    // 4. Calculate prices, taxes, and discounts
    const calculation = await calculateOrderDetails(connection, items, coupon_code);

    // 5. Generate Order Number
    const orderNumber = `SELF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 6. Insert order
    const [orderResult] = await connection.query(customerQueries.CREATE_SELF_ORDER, [
      orderNumber,
      table.id,
      session.id,
      session.employee_id, // link to session cashier
      calculation.subtotal,
      calculation.tax_amount,
      calculation.discount_amount,
      calculation.total_amount
    ]);
    const orderId = orderResult.insertId;

    // 7. Insert items
    for (const item of calculation.itemsWithTotals) {
      await connection.query(employeeQueries.CREATE_ORDER_ITEM, [
        orderId,
        item.product_id,
        item.quantity,
        item.unit_price,
        item.tax_amount,
        item.discount_amount,
        item.line_total
      ]);
    }

    await connection.commit();

    // 8. Notify kitchen display KDS in real time via Socket.io
    try {
      const { getSocketIO } = require("../../config/socket");
      const io = getSocketIO();
      io.to("kitchen").emit("kitchen:orderUpdated", { orderId, status: "TO_COOK" });
    } catch (wsErr) {
      console.warn("KDS socket notify failed:", wsErr.message);
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully! Sent to kitchen display.",
      orderId,
      orderNumber,
      total_amount: calculation.total_amount
    });

  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Track guest order status
 */
async function trackOrderStatus(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    const [orders] = await connection.query("SELECT id, order_number, status, total_amount FROM orders WHERE id = ?", [id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const [items] = await connection.query(employeeQueries.GET_ORDER_ITEMS, [id]);
    res.status(200).json({
      success: true,
      order: {
        ...orders[0],
        items
      }
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Fetch current active order status for Customer Facing Display
 */
async function getCustomerDisplay(req, res, next) {
  const { tableToken } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    // Retrieve active order on the table
    const [orders] = await connection.query(customerQueries.GET_ACTIVE_ORDER_FOR_TABLE, [tableToken]);
    if (orders.length === 0) {
      return res.status(200).json({ success: true, activeOrder: null });
    }
    const order = orders[0];
    const [items] = await connection.query(employeeQueries.GET_ORDER_ITEMS, [order.id]);
    order.items = items;

    res.status(200).json({ success: true, activeOrder: order });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function applyCoupon(req, res, next) {
  const { couponCode, orderAmount } = req.body;

  if (!couponCode || orderAmount === undefined) {
    return res.status(400).json({ success: false, message: "couponCode and orderAmount are required" });
  }

  const amount = parseFloat(orderAmount);
  if (isNaN(amount) || amount < 0) {
    return res.status(400).json({ success: false, message: "orderAmount must be a non-negative number" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [coupons] = await connection.query(employeeQueries.GET_ACTIVE_COUPON, [couponCode]);

    if (coupons.length === 0) {
      return res.status(404).json({ success: false, message: "Coupon code is invalid, inactive or expired" });
    }

    const coupon = coupons[0];
    let discountAmount = 0;

    if (coupon.discount_type === "PERCENTAGE") {
      discountAmount = amount * (parseFloat(coupon.discount_value) / 100);
    } else if (coupon.discount_type === "FIXED") {
      discountAmount = parseFloat(coupon.discount_value);
    }

    // Limit discount to order subtotal
    if (discountAmount > amount) {
      discountAmount = amount;
    }

    const finalAmount = amount - discountAmount;

    res.status(200).json({
      success: true,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      discountType: coupon.discount_type,
      finalAmount: parseFloat(finalAmount.toFixed(2))
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  getCustomerMenu,
  getTableDetails,
  placeSelfOrder,
  trackOrderStatus,
  getCustomerDisplay,
  applyCoupon
};
