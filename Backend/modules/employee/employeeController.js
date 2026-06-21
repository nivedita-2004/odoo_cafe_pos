const { pool } = require("../../config/db");
const employeeQueries = require("./employeeQuery");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const socketService = require("../../sockets/socketService");
const crypto = require("crypto");
const { getRazorpayClient } = require("../../config/razorpay");

const tableQrCache = new Map();

async function getCachedTableQr(url) {
  const cached = tableQrCache.get(url);
  if (cached) return cached;

  const qrDataUrl = await QRCode.toDataURL(url);
  tableQrCache.set(url, qrDataUrl);
  return qrDataUrl;
}

function getPagination(query) {
  if (query.page === undefined && query.limit === undefined) return null;

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

function paginationMeta(total, pagination) {
  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.ceil(total / pagination.limit)
  };
}

// Nodemailer Config
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "your_email@gmail.com",
    pass: process.env.EMAIL_PASS || "your_app_password"
  }
});



async function getActiveSession(req, res, next) {
  const employeeId = req.user.id;
  let connection;
  try {
    connection = await pool.getConnection();
    const [sessions] = await connection.query(employeeQueries.GET_ACTIVE_SESSION, [employeeId]);
    if (sessions.length === 0) {
      return res.status(200).json({ success: true, activeSession: null });
    }
    res.status(200).json({ success: true, activeSession: sessions[0] });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function getLastSession(req, res, next) {
  const employeeId = req.user.id;
  let connection;
  try {
    connection = await pool.getConnection();
    const [sessions] = await connection.query(employeeQueries.GET_LAST_SESSION, [employeeId]);
    if (sessions.length === 0) {
      return res.status(200).json({ success: true, lastSession: null });
    }
    res.status(200).json({ success: true, lastSession: sessions[0] });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function openSession(req, res, next) {
  const employeeId = req.user.id;
  const { opening_amount } = req.body;

  if (opening_amount === undefined) {
    return res.status(400).json({ success: false, message: "Opening cash amount is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Check if session already open
    const [existing] = await connection.query(employeeQueries.GET_ACTIVE_SESSION, [employeeId]);
    if (existing.length > 0) {
      return res.status(200).json({ success: true, message: "Session already active", session: existing[0] });
    }

    const [result] = await connection.query(employeeQueries.OPEN_SESSION, [employeeId, opening_amount]);
    const sessionId = result.insertId;

    res.status(201).json({
      success: true,
      message: "POS session opened successfully",
      session: { id: sessionId, employee_id: employeeId, opening_amount, status: "OPEN" }
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function closeSession(req, res, next) {
  const { id } = req.params;
  const { closing_amount } = req.body;

  if (closing_amount === undefined) {
    return res.status(400).json({ success: false, message: "Closing cash amount is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Get session
    const [sessions] = await connection.query("SELECT * FROM pos_sessions WHERE id = ?", [id]);
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const session = sessions[0];
    if (session.status === "CLOSED") {
      return res.status(400).json({ success: false, message: "Session is already closed" });
    }

    // Discrepancy checks: Calculate expected sales
    const [salesResult] = await connection.query(employeeQueries.GET_SESSION_TOTAL_SALES, [id]);
    const totalSales = parseFloat(salesResult[0]?.total_sales || 0);
    const expectedClosing = parseFloat(session.opening_amount) + totalSales;
    const discrepancy = parseFloat(closing_amount) - expectedClosing;

    await connection.query(employeeQueries.CLOSE_SESSION, [closing_amount, id]);

    res.status(200).json({
      success: true,
      message: "POS session closed successfully",
      discrepancy: discrepancy.toFixed(2),
      expected_closing: expectedClosing.toFixed(2),
      actual_closing: parseFloat(closing_amount).toFixed(2),
      discrepancy_detected: discrepancy !== 0
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function listPosTables(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [tables] = await connection.query(employeeQueries.LIST_POS_TABLES);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const tablesWithQr = await Promise.all(
      tables.map(async (table) => {
        const url = `${frontendUrl}/table/${table.unique_token}`;
        const qrDataUrl = await getCachedTableQr(url);
        return { ...table, qrUrl: url, qrDataUrl };
      })
    );
    res.status(200).json({ success: true, tables: tablesWithQr });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function getTableQRCode(req, res, next) {
  const { token } = req.params;
  try {
    const url = `${process.env.FRONTEND_URL || "http://localhost:5173"}/table/${token}`;
    const qrDataUrl = await getCachedTableQr(url);
    res.status(200).json({ success: true, url, qrDataUrl });
  } catch (error) {
    next(error);
  }
}

//customer management

async function searchCustomers(req, res, next) {
  const { query } = req.query;
  const searchPattern = `%${query || ""}%`;

  let connection;
  try {
    connection = await pool.getConnection();
    const [customers] = await connection.query(employeeQueries.SEARCH_CUSTOMERS, [searchPattern, searchPattern, searchPattern]);
    res.status(200).json({ success: true, customers });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function createCustomer(req, res, next) {
  const { name, email, phone } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: "Customer name is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(employeeQueries.CREATE_CUSTOMER, [name, email || null, phone || null]);
    res.status(201).json({
      success: true,
      message: "Customer record created successfully",
      customer: { id: result.insertId, name, email, phone }
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function updateCustomer(req, res, next) {
  const { id } = req.params;
  const { name, email, phone } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: "Customer name is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(employeeQueries.UPDATE_CUSTOMER, [name, email || null, phone || null, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Customer not found or already deleted" });
    }

    res.status(200).json({
      success: true,
      message: "Customer record updated successfully",
      customer: { id: parseInt(id), name, email, phone }
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function deleteCustomer(req, res, next) {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(employeeQueries.SOFT_DELETE_CUSTOMER, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    res.status(200).json({
      success: true,
      message: "Customer record deleted successfully (soft delete)"
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}


// Pricing, Coupon and Promotions Engine

const toPositiveNumber = (value) => Math.max(parseFloat(value) || 0, 0);
const clampDiscount = (value, maxAmount) => Math.min(toPositiveNumber(value), Math.max(maxAmount, 0));

async function calculateOrderDetails(connection, items, couponCode) {
  let subtotal = 0;
  let tax_amount = 0;
  let discount_amount = 0;
  let promotion_discount_amount = 0;
  let coupon_discount_amount = 0;

  const itemsWithTotals = [];
  
  
  for (const item of items) {
    const [products] = await connection.query(employeeQueries.GET_PRODUCT_FOR_CALC, [item.product_id]);
    if (products.length === 0) {
      throw new Error(`Product with ID ${item.product_id} not found or inactive`);
    }
    const product = products[0];
    const unitPrice = toPositiveNumber(product.price);
    const quantity = toPositiveNumber(item.quantity);
    const itemSubtotal = unitPrice * quantity;

    subtotal += itemSubtotal;

    itemsWithTotals.push({
      product_id: item.product_id,
      quantity,
      unit_price: unitPrice,
      tax_percentage: toPositiveNumber(product.tax_percentage),
      item_subtotal: itemSubtotal,
      discount_amount: 0, // calculated later
      tax_amount: 0, // calculated later
      line_total: 0 // calculated later
    });
  }

  const grossSubtotal = subtotal;

  // 2. Compute Automated Promotions
  let bestPromotionDiscount = 0;

  // Check product-level promotions
  for (const item of itemsWithTotals) {
    const [productPromos] = await connection.query(employeeQueries.GET_ACTIVE_PRODUCT_PROMOTIONS, [item.product_id]);
    for (const promo of productPromos) {
      if (item.quantity >= promo.min_quantity) {
        let promoDiscount = 0;
        const discountValue = toPositiveNumber(promo.discount_value);
        if (promo.discount_type === "PERCENTAGE") {
          promoDiscount = grossSubtotal * (discountValue / 100);
        } else if (promo.discount_type === "FIXED") {
          promoDiscount = discountValue;
        }
        promoDiscount = clampDiscount(promoDiscount, grossSubtotal);
        if (promoDiscount > bestPromotionDiscount) {
          bestPromotionDiscount = promoDiscount;
        }
      }
    }
  }

  // Check order-level promotions
  const [orderPromos] = await connection.query(employeeQueries.GET_ACTIVE_ORDER_PROMOTIONS);
  for (const promo of orderPromos) {
    if (grossSubtotal >= toPositiveNumber(promo.min_order_amount)) {
      let promoDiscount = 0;
      const discountValue = toPositiveNumber(promo.discount_value);
      if (promo.discount_type === "PERCENTAGE") {
        promoDiscount = grossSubtotal * (discountValue / 100);
      } else if (promo.discount_type === "FIXED") {
        promoDiscount = discountValue;
      }
      promoDiscount = clampDiscount(promoDiscount, grossSubtotal);
      if (promoDiscount > bestPromotionDiscount) {
        bestPromotionDiscount = promoDiscount;
      }
    }
  }

  promotion_discount_amount = clampDiscount(bestPromotionDiscount, grossSubtotal);

  // 3. Coupon Codes
  let couponId = null;
  if (couponCode) {
    const [coupons] = await connection.query(employeeQueries.GET_ACTIVE_COUPON, [couponCode]);
    if (coupons.length > 0) {
      const coupon = coupons[0];
      couponId = coupon.id;
      let couponDiscount = 0;
      const discountValue = toPositiveNumber(coupon.discount_value);
      if (coupon.discount_type === "PERCENTAGE") {
        couponDiscount = grossSubtotal * (discountValue / 100);
      } else if (coupon.discount_type === "FIXED") {
        couponDiscount = discountValue;
      }
      coupon_discount_amount = clampDiscount(couponDiscount, grossSubtotal - promotion_discount_amount);
    }
  }

  discount_amount = promotion_discount_amount + coupon_discount_amount;

  // Apportion discount first, then calculate tax on the discounted taxable amount.
  for (const item of itemsWithTotals) {
    const share = grossSubtotal > 0 ? (item.item_subtotal / grossSubtotal) : 0;
    item.discount_amount = parseFloat((discount_amount * share).toFixed(2));

    const taxableAmount = Math.max(item.item_subtotal - item.discount_amount, 0);
    item.tax_amount = parseFloat((taxableAmount * (item.tax_percentage / 100)).toFixed(2));
    item.line_total = parseFloat((taxableAmount + item.tax_amount).toFixed(2));

    tax_amount += item.tax_amount;
  }

  const total_amount = parseFloat((grossSubtotal - discount_amount + tax_amount).toFixed(2));

  return {
    subtotal: grossSubtotal,
    tax_amount: parseFloat(tax_amount.toFixed(2)),
    discount_amount: parseFloat(discount_amount.toFixed(2)),
    promotion_discount_amount: parseFloat(promotion_discount_amount.toFixed(2)),
    coupon_discount_amount: parseFloat(coupon_discount_amount.toFixed(2)),
    total_amount,
    coupon_id: couponId,
    itemsWithTotals
  };
}

async function previewOrderTotals(req, res, next) {
  const { coupon_code, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "Items array is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const calculation = await calculateOrderDetails(connection, items, coupon_code);

    res.status(200).json({
      success: true,
      totals: {
        subtotal: calculation.subtotal,
        tax: calculation.tax_amount,
        productDiscount: calculation.promotion_discount_amount,
        orderDiscount: 0,
        couponDiscount: calculation.coupon_discount_amount,
        total: calculation.total_amount
      }
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function applyEmployeeCoupon(req, res, next) {
  const { coupon_code, order_amount } = req.body;

  if (!coupon_code) {
    return res.status(400).json({ success: false, message: "Coupon code is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [coupons] = await connection.query(employeeQueries.GET_ACTIVE_COUPON, [coupon_code.trim()]);

    if (coupons.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid coupon code" });
    }

    const coupon = coupons[0];
    const amount = toPositiveNumber(order_amount);
    const discountValue = toPositiveNumber(coupon.discount_value);
    const rawDiscountAmount =
      coupon.discount_type === "PERCENTAGE"
        ? (amount * discountValue) / 100
        : discountValue;
    const discountAmount = clampDiscount(rawDiscountAmount, amount);

    res.status(200).json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.discount_type === "PERCENTAGE" ? "percent" : "fixed",
        value: discountValue,
        discountAmount: parseFloat(discountAmount.toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// Order CRUD Handlers
// ==========================================

async function createOrder(req, res, next) {
  const { table_id, customer_id, coupon_code, items } = req.body;
  const employeeId = req.user.id;

  if (!table_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "Table ID and non-empty items array are required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check active session for this employee
    const [sessions] = await connection.query(employeeQueries.GET_ACTIVE_SESSION, [employeeId]);
    if (sessions.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "No active POS session. Please open a session first." });
    }
    const session = sessions[0];

    // Compute totals using engine
    const calculation = await calculateOrderDetails(connection, items, coupon_code);

    // Generate Order Number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Insert Order
    const [orderResult] = await connection.query(employeeQueries.CREATE_ORDER, [
      orderNumber,
      table_id,
      customer_id || null,
      session.id,
      employeeId,
      calculation.coupon_id,
      calculation.subtotal,
      calculation.tax_amount,
      calculation.discount_amount,
      calculation.total_amount
    ]);

    const orderId = orderResult.insertId;

    // Insert Items
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
    res.status(201).json({
      success: true,
      message: "POS Order created as DRAFT successfully",
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

async function getOrder(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();

    const [orders] = await connection.query(employeeQueries.GET_ORDER, [id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const [items] = await connection.query(employeeQueries.GET_ORDER_ITEMS, [id]);
    const [payments] = await connection.query(employeeQueries.GET_PAYMENTS_FOR_ORDER, [id]);
    const order = orders[0];
    order.items = items;
    order.payments = payments;

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function updateOrder(req, res, next) {
  const { id } = req.params;
  const { coupon_code, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "Items array is required to update order" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verify order exists and is editable
    const [orders] = await connection.query("SELECT status FROM orders WHERE id = ?", [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const orderStatus = orders[0].status;
    if (orderStatus === "PAID" || orderStatus === "CANCELLED") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Completed or cancelled orders cannot be updated (Current status: ${orderStatus})` });
    }

    // Run calculation engine
    const calculation = await calculateOrderDetails(connection, items, coupon_code);

    // Update orders table totals
    await connection.query(employeeQueries.UPDATE_ORDER_TOTALS, [
      calculation.subtotal,
      calculation.tax_amount,
      calculation.discount_amount,
      calculation.total_amount,
      id
    ]);

    // Recreate items
    await connection.query(employeeQueries.DELETE_ORDER_ITEMS, [id]);
    for (const item of calculation.itemsWithTotals) {
      await connection.query(employeeQueries.CREATE_ORDER_ITEM, [
        id,
        item.product_id,
        item.quantity,
        item.unit_price,
        item.tax_amount,
        item.discount_amount,
        item.line_total
      ]);
    }

    await connection.commit();
    res.status(200).json({
      success: true,
      message: "Order updated and recalculated successfully",
      total_amount: calculation.total_amount
    });

  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function updateOrderStatus(req, res, next) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: "Status is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(employeeQueries.UPDATE_ORDER_STATUS, [status, id]);

    // If order was moved to kitchen, emit socket event
    if (["TO_COOK", "PREPARING", "COMPLETED"].includes(status)) {
      try {
        const { getSocketIO } = require("../../config/socket");
        const io = getSocketIO();
        io.to("kitchen").emit("kitchen:orderUpdated", { orderId: id, status });
        console.log(`[SOCKET] Broadcasted order status update to kitchen. Order ID: ${id}, Status: ${status}`);
      } catch (wsErr) {
        console.warn("Socket notification failed:", wsErr.message);
      }
    }

    res.status(200).json({ success: true, message: `Order status updated to ${status}` });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// Payments Engine & UPI QR Generator
// ==========================================

async function getUPIQrCode(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [orders] = await connection.query("SELECT order_number, total_amount FROM orders WHERE id = ?", [id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const order = orders[0];

    // Fetch enabled UPI payment method
    const [upiMethod] = await connection.query(employeeQueries.GET_UPI_PAYMENT_METHOD);
    if (upiMethod.length === 0 || !upiMethod[0].upi_id) {
      return res.status(400).json({ success: false, message: "UPI QR Payment is not currently enabled in configuration" });
    }

    const upiId = upiMethod[0].upi_id;
    // Generate standard UPI payload URI
    const upiLink = `upi://pay?pa=${upiId}&pn=Odoo%20Cafe%20POS&am=${parseFloat(order.total_amount).toFixed(2)}&tn=${order.order_number}`;

    const qrDataUrl = await QRCode.toDataURL(upiLink);

    res.status(200).json({
      success: true,
      upi_id: upiId,
      upi_link: upiLink,
      qrDataUrl
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function createEmployeeRazorpayOrder(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();

    const [orders] = await connection.query("SELECT id, order_number, table_id, total_amount FROM orders WHERE id = ?", [id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
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
        tableId: String(order.table_id || "")
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

async function verifyEmployeeRazorpayPayment(req, res, next) {
  const { id } = req.params;
  const {
    payment_method,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  const method = String(payment_method || "").toUpperCase();
  if (!["CARD", "UPI"].includes(method)) {
    return res.status(400).json({ success: false, message: "Valid Razorpay payment method is required" });
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
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

    const [orders] = await connection.query("SELECT * FROM orders WHERE id = ?", [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const order = orders[0];

    const [payments] = await connection.query(employeeQueries.GET_PAYMENTS_FOR_ORDER, [id]);
    if (payments.some((payment) => payment.payment_status === "SUCCESS")) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Payment already completed for this order" });
    }

    await connection.query(employeeQueries.RECORD_PAYMENT, [
      id,
      method,
      razorpay_payment_id,
      order.total_amount
    ]);

    const shouldSendToKitchen = order.status === "DRAFT";

    if (shouldSendToKitchen) {
      await connection.query(employeeQueries.UPDATE_ORDER_STATUS, ["TO_COOK", id]);
      await connection.query(employeeQueries.UPDATE_ORDER_ITEMS_STATUS, ["TO_COOK", id]);
    }

    await connection.commit();

    if (shouldSendToKitchen) {
      const [updatedOrders] = await connection.query(employeeQueries.GET_ORDER, [id]);
      const [items] = await connection.query(employeeQueries.GET_ORDER_ITEMS, [id]);
      const orderData = updatedOrders[0];
      orderData.items = items;
      socketService.notifyNewOrderToKitchen(orderData);
    }

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

async function payOrder(req, res, next) {
  const { id } = req.params;
  const { payment_method, transaction_reference, amount, send_email } = req.body;

  if (!payment_method || amount === undefined) {
    return res.status(400).json({ success: false, message: "Payment method and paid amount are required" });
  }

  if (["CARD", "UPI", "RAZORPAY"].includes(String(payment_method).toUpperCase())) {
    return res.status(410).json({
      success: false,
      message: "Manual online payment is disabled. Please use Razorpay checkout."
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [orders] = await connection.query("SELECT * FROM orders WHERE id = ?", [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const order = orders[0];

    if (order.status === "PAID") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Order has already been paid" });
    }

    // Insert payment record
    await connection.query(employeeQueries.RECORD_PAYMENT, [
      id,
      payment_method,
      transaction_reference || null,
      amount
    ]);

    const shouldSendToKitchen = order.status === "DRAFT";

    if (shouldSendToKitchen) {
      await connection.query(employeeQueries.UPDATE_ORDER_STATUS, ["TO_COOK", id]);
      await connection.query(employeeQueries.UPDATE_ORDER_ITEMS_STATUS, ["TO_COOK", id]);
    }

    await connection.commit();

    if (shouldSendToKitchen) {
      const [updatedOrders] = await connection.query(employeeQueries.GET_ORDER, [id]);
      const [items] = await connection.query(employeeQueries.GET_ORDER_ITEMS, [id]);
      const orderData = updatedOrders[0];
      orderData.items = items;
      socketService.notifyNewOrderToKitchen(orderData);
    }

    // Optionally send email receipt if requested
    if (send_email && order.customer_id) {
      const [customers] = await connection.query("SELECT name, email FROM customers WHERE id = ?", [order.customer_id]);
      if (customers.length > 0 && customers[0].email) {
        const customer = customers[0];
        const [items] = await connection.query(employeeQueries.GET_ORDER_ITEMS, [id]);
        
        let receiptHtml = `
          <h3>Odoo Cafe POS - Receipt</h3>
          <p>Hi ${customer.name},</p>
          <p>Thank you for dining with us! Here is your payment receipt.</p>
          <hr/>
          <p><strong>Order Number:</strong> ${order.order_number}</p>
          <p><strong>Payment Method:</strong> ${payment_method}</p>
          <p><strong>Paid Amount:</strong> $${parseFloat(amount).toFixed(2)}</p>
          <hr/>
          <table border="1" cellpadding="5" style="border-collapse: collapse;">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
        `;

        items.forEach(item => {
          receiptHtml += `
            <tr>
              <td>${item.product_name}</td>
              <td>${item.quantity}</td>
              <td>$${parseFloat(item.unit_price).toFixed(2)}</td>
              <td>$${parseFloat(item.line_total).toFixed(2)}</td>
            </tr>
          `;
        });

        receiptHtml += `
            </tbody>
          </table>
          <hr/>
          <p>Subtotal: $${parseFloat(order.subtotal).toFixed(2)}</p>
          <p>Discounts: $${parseFloat(order.discount_amount).toFixed(2)}</p>
          <p>Taxes: $${parseFloat(order.tax_amount).toFixed(2)}</p>
          <h3>Grand Total Paid: $${parseFloat(order.total_amount).toFixed(2)}</h3>
        `;

        // Send Async Mail
        transporter.sendMail({
          from: `"Odoo Cafe POS" <${process.env.EMAIL_USER}>`,
          to: customer.email,
          subject: `Payment Receipt: ${order.order_number}`,
          html: receiptHtml
        }).catch(err => console.error("Async receipt sending failed:", err.message));
      }
    }

    res.status(200).json({
      success: true,
      message: shouldSendToKitchen
        ? "Payment successfully recorded, order sent to kitchen"
        : "Payment successfully recorded",
      orderId: id,
      paymentStatus: "SUCCESS"
    });

  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function getReceiptPDF(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();

    const [orders] = await connection.query(employeeQueries.GET_ORDER, [id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const order = orders[0];
    const [items] = await connection.query(employeeQueries.GET_ORDER_ITEMS, [id]);

    const doc = new PDFDocument({ size: [300, 600], margin: 15 }); // receipt roll size
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=receipt_${order.order_number}.pdf`);

    doc.pipe(res);

    doc.fontSize(16).text("Odoo Cafe Restaurant", { align: "center" });
    doc.fontSize(8).text("Floor: " + order.floor_name + " | Table: " + order.table_number, { align: "center" });
    doc.text("Receipt #: " + order.order_number, { align: "center" });
    doc.text(new Date(order.created_at).toLocaleString(), { align: "center" });
    doc.moveDown();

    doc.strokeColor("#000000").lineWidth(1).moveTo(15, doc.y).lineTo(285, doc.y).stroke();
    doc.moveDown(0.5);

    // Header columns
    doc.text("Item", 15, doc.y, { width: 140, continued: true });
    doc.text("Qty", 160, doc.y, { width: 30, continued: true });
    doc.text("Price", 195, doc.y, { width: 40, continued: true });
    doc.text("Total", 240, doc.y, { width: 45 });
    doc.moveDown(0.5);

    items.forEach(item => {
      doc.text(item.product_name, 15, doc.y, { width: 140, continued: true });
      doc.text(String(item.quantity), 160, doc.y, { width: 30, continued: true });
      doc.text(`$${parseFloat(item.unit_price).toFixed(2)}`, 195, doc.y, { width: 40, continued: true });
      doc.text(`$${parseFloat(item.line_total).toFixed(2)}`, 240, doc.y, { width: 45 });
    });

    doc.moveDown();
    doc.strokeColor("#000000").lineWidth(1).moveTo(15, doc.y).lineTo(285, doc.y).stroke();
    doc.moveDown(0.5);

    doc.text(`Subtotal: $${parseFloat(order.subtotal).toFixed(2)}`, 150, doc.y, { align: "right" });
    doc.text(`Discount: -$${parseFloat(order.discount_amount).toFixed(2)}`, 150, doc.y, { align: "right" });
    doc.text(`Taxes: $${parseFloat(order.tax_amount).toFixed(2)}`, 150, doc.y, { align: "right" });
    
    doc.fontSize(10).text(`Total Paid: $${parseFloat(order.total_amount).toFixed(2)}`, 150, doc.y, { align: "right", style: "bold" });
    doc.moveDown(2);
    
    doc.fontSize(8).text("Thank you for your visit!", { align: "center" });

    doc.end();

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function listOrders(req, res, next) {
  const { status } = req.query;
  const statusPattern = status ? status : "%";
  const pagination = getPagination(req.query);

  let connection;
  try {
    connection = await pool.getConnection();

    if (pagination) {
      const [orders] = await connection.query(employeeQueries.LIST_ORDERS_PAGED, [
        statusPattern,
        pagination.limit,
        pagination.offset
      ]);
      const [[countRow]] = await connection.query(employeeQueries.COUNT_ORDERS, [statusPattern]);
      return res.status(200).json({
        success: true,
        orders,
        pagination: paginationMeta(countRow.total, pagination)
      });
    }

    const [orders] = await connection.query(employeeQueries.LIST_ORDERS, [statusPattern]);
    res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function sendToKitchen(req, res, next) {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Validate order exists
    const [orders] = await connection.query("SELECT * FROM orders WHERE id = ?", [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orders[0];

    // 2. Validate order is still in DRAFT status
    if (order.status !== "DRAFT") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Only DRAFT orders can be sent to the kitchen (Current status: ${order.status})` });
    }

    // 3. Update order status to TO_COOK
    await connection.query(employeeQueries.UPDATE_ORDER_STATUS, ["TO_COOK", id]);

    // 4. Update all order_items status to TO_COOK
    await connection.query(employeeQueries.UPDATE_ORDER_ITEMS_STATUS, ["TO_COOK", id]);

    await connection.commit();

    // Fetch the updated order details to return and emit
    const [updatedOrders] = await connection.query(employeeQueries.GET_ORDER, [id]);
    const [items] = await connection.query(employeeQueries.GET_ORDER_ITEMS, [id]);
    const orderData = updatedOrders[0];
    orderData.items = items;

    // 5. Emit Socket.IO event via SocketService
    socketService.notifyNewOrderToKitchen(orderData);

    // 6. Return updated order response
    res.status(200).json({
      success: true,
      message: "Order successfully sent to kitchen",
      order: orderData
    });

  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  getActiveSession,
  getLastSession,
  listPosTables,
  getTableQRCode,
  openSession,
  closeSession,
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  previewOrderTotals,
  applyEmployeeCoupon,
  createOrder,
  getOrder,
  updateOrder,
  updateOrderStatus,
  getUPIQrCode,
  createEmployeeRazorpayOrder,
  verifyEmployeeRazorpayPayment,
  payOrder,
  getReceiptPDF,
  listOrders,
  calculateOrderDetails,
  sendToKitchen
};
