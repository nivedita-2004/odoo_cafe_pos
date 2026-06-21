const { pool } = require("../../config/db");
const customerQueries = require("./customerQuery");
const employeeQueries = require("../employee/employeeQuery");
const { calculateOrderDetails } = require("../employee/employeeController");
const socketService = require("../../sockets/socketService");
const crypto = require("crypto");
const QRCode = require("qrcode");
const { getRazorpayClient } = require("../../config/razorpay");


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
        image_url: p.image_url,
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
    socketService.notifyNewOrderToKitchen({ orderId, status: "TO_COOK" });

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
    const [payments] = await connection.query(employeeQueries.GET_PAYMENTS_FOR_ORDER, [id]);
    res.status(200).json({
      success: true,
      order: {
        ...orders[0],
        items,
        payments
      }
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function getCustomerOrderHistory(req, res, next) {
  const { token } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    const [orders] = await connection.query(customerQueries.GET_ORDER_HISTORY_FOR_TABLE, [token]);

    if (orders.length > 0) {
      const orderIds = orders.map((order) => order.id);
      const [items] = await connection.query(customerQueries.GET_ITEMS_FOR_ORDERS, [orderIds]);
      const itemsByOrder = items.reduce((result, item) => {
        if (!result[item.order_id]) result[item.order_id] = [];
        result[item.order_id].push(item);
        return result;
      }, {});

      orders.forEach((order) => {
        order.items = itemsByOrder[order.id] || [];
      });
    }

    res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function getCustomerUPIQrCode(req, res, next) {
  const { id } = req.params;
  const { table_token } = req.query;

  if (!table_token) {
    return res.status(400).json({ success: false, message: "Table token is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const [orders] = await connection.query(customerQueries.GET_ORDER_FOR_TABLE, [id, table_token]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found for this table" });
    }
    const order = orders[0];

    const [upiMethod] = await connection.query(employeeQueries.GET_UPI_PAYMENT_METHOD);
    if (upiMethod.length === 0 || !upiMethod[0].upi_id) {
      return res.status(400).json({ success: false, message: "UPI QR Payment is not currently enabled" });
    }

    const upiId = upiMethod[0].upi_id;
    const upiLink = `upi://pay?pa=${upiId}&pn=Odoo%20Cafe%20POS&am=${parseFloat(order.total_amount).toFixed(2)}&tn=${order.order_number}`;
    const qrDataUrl = await QRCode.toDataURL(upiLink);

    res.status(200).json({
      success: true,
      upi_id: upiId,
      upi_link: upiLink,
      qrDataUrl,
      amount: parseFloat(order.total_amount)
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function createCustomerRazorpayOrder(req, res, next) {
  const { id } = req.params;
  const { table_token } = req.body;

  if (!table_token) {
    return res.status(400).json({ success: false, message: "Table token is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const [orders] = await connection.query(customerQueries.GET_ORDER_FOR_TABLE, [id, table_token]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found for this table" });
    }
    const order = orders[0];

    const [payments] = await connection.query(employeeQueries.GET_PAYMENTS_FOR_ORDER, [id]);
    if (payments.some((payment) => payment.payment_status === "SUCCESS")) {
      return res.status(400).json({ success: false, message: "Payment already completed for this order" });
    }

    const amount = Math.round(parseFloat(order.total_amount) * 100);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid order amount" });
    }

    const razorpay = getRazorpayClient();
    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: process.env.RAZORPAY_CURRENCY || "INR",
      receipt: order.order_number,
      notes: {
        orderId: String(order.id),
        tableId: String(order.table_id)
      }
    });

    res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderNumber: order.order_number,
      orderId: order.id
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function verifyCustomerRazorpayPayment(req, res, next) {
  const { id } = req.params;
  const {
    table_token,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  if (!table_token || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: "Razorpay payment details are required" });
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ success: false, message: "Razorpay credentials are not configured" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(razorpay_signature);

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return res.status(400).json({ success: false, message: "Payment verification failed" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [orders] = await connection.query(customerQueries.GET_ORDER_FOR_TABLE, [id, table_token]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Order not found for this table" });
    }
    const order = orders[0];

    const [payments] = await connection.query(employeeQueries.GET_PAYMENTS_FOR_ORDER, [id]);
    if (payments.some((payment) => payment.payment_status === "SUCCESS")) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Payment already completed for this order" });
    }

    await connection.query(employeeQueries.RECORD_PAYMENT, [
      id,
      "RAZORPAY",
      razorpay_payment_id,
      order.total_amount
    ]);

    await connection.commit();

    res.status(200).json({
      success: true,
      message: "Razorpay payment verified successfully",
      orderId: id,
      paymentStatus: "SUCCESS",
      transactionReference: razorpay_payment_id
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function payCustomerOrder(req, res, next) {
  return res.status(410).json({
    success: false,
    message: "Manual customer payment is disabled. Please use Razorpay checkout."
  });
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
  getCustomerOrderHistory,
  getCustomerUPIQrCode,
  createCustomerRazorpayOrder,
  verifyCustomerRazorpayPayment,
  payCustomerOrder,
  getCustomerDisplay,
  applyCoupon
};
