const crypto = require("crypto");
const QRCode = require("qrcode");
const exceljs = require("exceljs");
const PDFDocument = require("pdfkit");
const { pool } = require("../../config/db");
const adminQueries = require("./adminQuery");
const { hashPassword } = require("../../utils/passwordUtils");

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


// User / Employee Management

async function listEmployees(req, res, next) {
  const pagination = getPagination(req.query);
  let connection;
  try {
    connection = await pool.getConnection();

    if (pagination) {
      const [employees] = await connection.query(adminQueries.LIST_EMPLOYEES_PAGED, [pagination.limit, pagination.offset]);
      const [[countRow]] = await connection.query(adminQueries.COUNT_EMPLOYEES);
      return res.status(200).json({
        success: true,
        employees,
        pagination: paginationMeta(countRow.total, pagination)
      });
    }

    const [employees] = await connection.query(adminQueries.LIST_EMPLOYEES);
    res.status(200).json({ success: true, employees });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function createEmployee(req, res, next) {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    // Check email uniqueness
    const [existing] = await connection.query("SELECT id FROM users WHERE email = ? AND is_deleted = 0", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Email is already in use" });
    }

    const hashedPassword = await hashPassword(password);
    await connection.query(adminQueries.CREATE_EMPLOYEE, [name, email, hashedPassword, role]);
    res.status(201).json({ success: true, message: "Employee account created successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function updateEmployee(req, res, next) {
  const { id } = req.params;
  const { name, email, role, is_active } = req.body;
  if (!name || !email || !role || is_active === undefined) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.UPDATE_EMPLOYEE, [name, email, role, is_active, id]);
    res.status(200).json({ success: true, message: "Employee account updated successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function deleteEmployee(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.SOFT_DELETE_EMPLOYEE, [id]);
    res.status(200).json({ success: true, message: "Employee account deleted successfully (soft delete)" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}


// Category Management

async function listCategories(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [categories] = await connection.query(adminQueries.LIST_CATEGORIES);
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function createCategory(req, res, next) {
  const { name, color, is_active } = req.body;
  if (!name || !color) {
    return res.status(400).json({ success: false, message: "Name and Color are required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.CREATE_CATEGORY, [name, color, is_active === undefined ? 1 : is_active]);
    res.status(201).json({ success: true, message: "Category created successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function updateCategory(req, res, next) {
  const { id } = req.params;
  const { name, color, is_active } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.UPDATE_CATEGORY, [name, color, is_active === undefined ? 1 : is_active, id]);
    res.status(200).json({ success: true, message: "Category updated successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function deleteCategory(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.DELETE_CATEGORY, [id]);
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "Category is linked with products. Disable it instead of deleting."
      });
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
}


// Product Management

async function ensureProductImageColumn(connection) {
  try {
    await connection.query(adminQueries.ENSURE_PRODUCT_IMAGE_COLUMN);
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      throw error;
    }
  }
}

async function listProducts(req, res, next) {
  const pagination = getPagination(req.query);
  let connection;
  try {
    connection = await pool.getConnection();
    await ensureProductImageColumn(connection);

    if (pagination) {
      const [products] = await connection.query(adminQueries.LIST_PRODUCTS_PAGED, [pagination.limit, pagination.offset]);
      const [[countRow]] = await connection.query(adminQueries.COUNT_PRODUCTS);
      return res.status(200).json({
        success: true,
        products,
        pagination: paginationMeta(countRow.total, pagination)
      });
    }

    const [products] = await connection.query(adminQueries.LIST_PRODUCTS);
    res.status(200).json({ success: true, products });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function createProduct(req, res, next) {
  const { name, description, price, unit, tax_percentage, is_active, category_id, category_name, category_color } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image_url || null;
  if (!name || price === undefined) {
    return res.status(400).json({ success: false, message: "Name and Price are required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureProductImageColumn(connection);
    await connection.beginTransaction();

    let targetCategoryId = category_id;

    // Support on-the-fly category generation
    if (!targetCategoryId && category_name && category_color) {
      const [existing] = await connection.query("SELECT id FROM categories WHERE name = ?", [category_name]);
      if (existing.length > 0) {
        targetCategoryId = existing[0].id;
      } else {
        const [catResult] = await connection.query(adminQueries.CREATE_CATEGORY, [category_name, category_color, 1]);
        targetCategoryId = catResult.insertId;
      }
    }

    if (!targetCategoryId) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Valid category_id or category_name + color is required" });
    }

    await connection.query(adminQueries.CREATE_PRODUCT, [
      targetCategoryId,
      name,
      description || "",
      price,
      unit || "PIECE",
      tax_percentage || 0,
      is_active === undefined ? 1 : is_active,
      imageUrl
    ]);

    await connection.commit();
    res.status(201).json({ success: true, message: "Product created successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function updateProduct(req, res, next) {
  const { id } = req.params;
  const { name, description, price, unit, tax_percentage, is_active, category_id, category_name, category_color } = req.body;
  const uploadedImageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureProductImageColumn(connection);
    await connection.beginTransaction();

    let targetCategoryId = category_id;

    // Support on-the-fly category generation on update
    if (!targetCategoryId && category_name && category_color) {
      const [existing] = await connection.query("SELECT id FROM categories WHERE name = ?", [category_name]);
      if (existing.length > 0) {
        targetCategoryId = existing[0].id;
      } else {
        const [catResult] = await connection.query(adminQueries.CREATE_CATEGORY, [category_name, category_color, 1]);
        targetCategoryId = catResult.insertId;
      }
    }

    // Retrieve original product to keep category if not provided
    if (!targetCategoryId) {
      const [orig] = await connection.query("SELECT category_id, image_url FROM products WHERE id = ?", [id]);
      if (orig.length > 0) {
        targetCategoryId = orig[0].category_id;
      }
    }

    const [originalProduct] = await connection.query("SELECT image_url FROM products WHERE id = ?", [id]);
    const imageUrl = uploadedImageUrl || req.body.image_url || originalProduct[0]?.image_url || null;

    await connection.query(adminQueries.UPDATE_PRODUCT, [
      targetCategoryId,
      name,
      description,
      price,
      unit || "PIECE",
      tax_percentage || 0,
      is_active === undefined ? 1 : is_active,
      imageUrl,
      id
    ]);

    await connection.commit();
    res.status(200).json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function deleteProduct(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.DELETE_PRODUCT, [id]);
    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}


// Floor & Table Plan Management

async function ensureTablePosStatusColumn(connection) {
  try {
    await connection.query(adminQueries.ENSURE_TABLE_POS_STATUS_COLUMN);
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      throw error;
    }
  }
}

async function listFloors(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [floors] = await connection.query(adminQueries.LIST_FLOORS);
    res.status(200).json({ success: true, floors });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function createFloor(req, res, next) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Floor name is required" });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.CREATE_FLOOR, [name]);
    res.status(201).json({ success: true, message: "Floor created successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function updateFloor(req, res, next) {
  const { id } = req.params;
  const { name } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.UPDATE_FLOOR, [name, id]);
    res.status(200).json({ success: true, message: "Floor updated successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function deleteFloor(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.DELETE_FLOOR, [id]);
    res.status(200).json({ success: true, message: "Floor deleted successfully" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "Floor has linked tables or orders. Delete or disable linked tables first."
      });
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function listTables(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    await ensureTablePosStatusColumn(connection);
    const [tables] = await connection.query(adminQueries.LIST_TABLES);
    res.status(200).json({ success: true, tables });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function createTable(req, res, next) {
  const { floor_id, table_number, seats, is_active, pos_status } = req.body;
  if (!floor_id || !table_number || !seats) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureTablePosStatusColumn(connection);
    const uniqueToken = crypto.randomBytes(16).toString("hex");
    const isActive = is_active === undefined ? 1 : is_active;
    const posStatus = pos_status || "available";

    await connection.query(adminQueries.CREATE_TABLE, [floor_id, table_number, seats, uniqueToken, isActive, posStatus]);
    res.status(201).json({ success: true, message: "Table added successfully", token: uniqueToken });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function updateTable(req, res, next) {
  const { id } = req.params;
  const { floor_id, table_number, seats, is_active, pos_status } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureTablePosStatusColumn(connection);
    await connection.query(adminQueries.UPDATE_TABLE, [
      floor_id,
      table_number,
      seats,
      is_active === undefined ? 1 : is_active,
      pos_status || "available",
      id
    ]);
    res.status(200).json({ success: true, message: "Table updated successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function deleteTable(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.DELETE_TABLE, [id]);
    res.status(200).json({ success: true, message: "Table deleted successfully" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "Table is linked with orders. Disable it instead of deleting."
      });
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function getTableQR(req, res, next) {
  const { token } = req.params;
  try {
    const url = `${process.env.FRONTEND_URL || "http://localhost:5173"}/table/${token}`;
    const qrDataUrl = await QRCode.toDataURL(url);
    res.status(200).json({ success: true, url, qrDataUrl });
  } catch (error) {
    next(error);
  }
}


// Payment Method Management


async function listPaymentMethods(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [methods] = await connection.query(adminQueries.LIST_PAYMENT_METHODS);
    res.status(200).json({ success: true, paymentMethods: methods });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function updatePaymentMethod(req, res, next) {
  const { id } = req.params;
  const { is_enabled, upi_id } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();

    const [methods] = await connection.query(adminQueries.GET_PAYMENT_METHOD_BY_ID, [id]);
    if (methods.length === 0) {
      return res.status(404).json({ success: false, message: "Payment method not found" });
    }

    const method = methods[0];
    const nextEnabled = is_enabled === undefined ? method.is_enabled : is_enabled;
    const nextUpiId = upi_id === undefined ? method.upi_id : upi_id || null;

    if (String(method.name).toUpperCase() === "UPI" && Number(nextEnabled) === 1 && !nextUpiId) {
      return res.status(400).json({
        success: false,
        message: "UPI ID is required before enabling UPI QR payment"
      });
    }

    await connection.query(adminQueries.UPDATE_PAYMENT_METHOD, [nextEnabled, nextUpiId, id]);
    res.status(200).json({ success: true, message: "Payment method updated successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// Coupon & Promotion Management
// ==========================================

async function ensurePromotionNameColumn(connection) {
  try {
    await connection.query(adminQueries.ENSURE_PROMOTION_NAME_COLUMN);
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      throw error;
    }
  }
}

async function listCoupons(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [coupons] = await connection.query(adminQueries.LIST_COUPONS);
    res.status(200).json({ success: true, coupons });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function createCoupon(req, res, next) {
  const { code, discount_type, discount_value, expiry_date, is_active } = req.body;
  if (!code || !discount_type || discount_value === undefined) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.CREATE_COUPON, [code, discount_type, discount_value, expiry_date || null, is_active === undefined ? 1 : is_active]);
    res.status(201).json({ success: true, message: "Coupon created successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function updateCoupon(req, res, next) {
  const { id } = req.params;
  const { code, discount_type, discount_value, expiry_date, is_active } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.UPDATE_COUPON, [
      code,
      discount_type,
      discount_value,
      expiry_date || null,
      is_active === undefined ? 1 : is_active,
      id
    ]);
    res.status(200).json({ success: true, message: "Coupon updated successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function deleteCoupon(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.DELETE_COUPON, [id]);
    res.status(200).json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function listPromotions(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    await ensurePromotionNameColumn(connection);
    const [promotions] = await connection.query(adminQueries.LIST_PROMOTIONS);
    res.status(200).json({ success: true, promotions });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function createPromotion(req, res, next) {
  const { name, promotion_type, product_id, min_quantity, min_order_amount, discount_type, discount_value, is_active } = req.body;
  if (!promotion_type || !discount_type || discount_value === undefined) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensurePromotionNameColumn(connection);
    await connection.query(adminQueries.CREATE_PROMOTION, [
      name || `${promotion_type} Promotion`,
      promotion_type,
      product_id || null,
      min_quantity || null,
      min_order_amount || null,
      discount_type,
      discount_value,
      is_active === undefined ? 1 : is_active
    ]);
    res.status(201).json({ success: true, message: "Promotion created successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function updatePromotion(req, res, next) {
  const { id } = req.params;
  const { name, promotion_type, product_id, min_quantity, min_order_amount, discount_type, discount_value, is_active } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await ensurePromotionNameColumn(connection);
    await connection.query(adminQueries.UPDATE_PROMOTION, [
      name || `${promotion_type} Promotion`,
      promotion_type,
      product_id || null,
      min_quantity || null,
      min_order_amount || null,
      discount_type,
      discount_value,
      is_active === undefined ? 1 : is_active,
      id
    ]);
    res.status(200).json({ success: true, message: "Promotion updated successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function deletePromotion(req, res, next) {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.DELETE_PROMOTION, [id]);
    res.status(200).json({ success: true, message: "Promotion deleted successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// Reporting & File Exports (PDF / Excel)
// ==========================================

// Helper: build dynamic SQL where clauses based on reports query filters
function buildOrderFilters(query) {
  let whereClauses = ["o.status = 'PAID'"];
  let params = [];

  if (query.period === "today") {
    whereClauses.push("DATE(o.created_at) = CURDATE()");
  } else if (query.period === "week") {
    whereClauses.push("o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)");
  } else if (query.period === "month") {
    whereClauses.push("o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)");
  } else if (query.period === "custom" && query.startDate && query.endDate) {
    whereClauses.push("o.created_at BETWEEN ? AND ?");
    params.push(query.startDate, query.endDate);
  }

  if (query.employee_id) {
    whereClauses.push("o.employee_id = ?");
    params.push(query.employee_id);
  }

  if (query.session_id) {
    whereClauses.push("o.session_id = ?");
    params.push(query.session_id);
  }

  if (query.product_id) {
    whereClauses.push("o.id IN (SELECT DISTINCT order_id FROM order_items WHERE product_id = ?)");
    params.push(query.product_id);
  }

  const where = "WHERE " + whereClauses.join(" AND ");
  return { where, params };
}

function buildSessionFilters(query) {
  let whereClauses = [];
  let params = [];

  if (query.employee_id) {
    whereClauses.push("s.employee_id = ?");
    params.push(query.employee_id);
  }

  if (query.session_id) {
    whereClauses.push("s.id = ?");
    params.push(query.session_id);
  }

  if (query.period === "today") {
    whereClauses.push("DATE(s.opening_time) = CURDATE()");
  } else if (query.period === "week") {
    whereClauses.push("s.opening_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)");
  } else if (query.period === "month") {
    whereClauses.push("s.opening_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)");
  } else if (query.period === "custom" && query.startDate && query.endDate) {
    whereClauses.push("s.opening_time BETWEEN ? AND ?");
    params.push(query.startDate, query.endDate);
  }

  const where = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";
  return { where, params };
}

async function getSalesReports(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const orderFilter = buildOrderFilters(req.query);
    const sessionFilter = buildSessionFilters(req.query);

    const summarySql = `
      SELECT 
        COUNT(o.id) AS total_orders,
        COALESCE(SUM(o.subtotal), 0) AS total_subtotal,
        COALESCE(SUM(o.tax_amount), 0) AS total_tax,
        COALESCE(SUM(o.discount_amount), 0) AS total_discount,
        COALESCE(SUM(o.total_amount), 0) AS total_sales
      FROM orders o
      ${orderFilter.where}
    `;

    const byDateSql = `
      SELECT 
        DATE(o.created_at) AS order_date,
        COUNT(o.id) AS order_count,
        COALESCE(SUM(o.total_amount), 0) AS daily_sales
      FROM orders o
      ${orderFilter.where}
      GROUP BY DATE(o.created_at)
      ORDER BY order_date DESC
    `;

    const byProductSql = `
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
      ${orderFilter.where}
      GROUP BY p.id, p.name, c.name
      ORDER BY total_revenue DESC
    `;

    const byCategorySql = `
      SELECT 
        c.id AS category_id,
        c.name AS category_name,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi.line_total) AS total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      ${orderFilter.where}
      GROUP BY c.id, c.name
      ORDER BY total_revenue DESC
    `;

    const topOrdersSql = `
      SELECT
        o.id AS order_id,
        o.order_number,
        o.total_amount,
        o.status,
        o.created_at,
        t.table_number,
        c.name AS customer_name,
        u.name AS employee_name
      FROM orders o
      LEFT JOIN cafe_tables t ON o.table_id = t.id
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.employee_id = u.id
      ${orderFilter.where}
      ORDER BY o.total_amount DESC
      LIMIT 8
    `;

    const sessionsSql = `
      SELECT s.*, u.name AS employee_name
      FROM pos_sessions s
      JOIN users u ON s.employee_id = u.id
      ${sessionFilter.where}
      ORDER BY s.opening_time DESC
    `;

    const [[summary]] = await connection.query(summarySql, orderFilter.params);
    const [byDate] = await connection.query(byDateSql, orderFilter.params);
    const [byProduct] = await connection.query(byProductSql, orderFilter.params);
    const [byCategory] = await connection.query(byCategorySql, orderFilter.params);
    const [topOrders] = await connection.query(topOrdersSql, orderFilter.params);
    const [sessions] = await connection.query(sessionsSql, sessionFilter.params);

    res.status(200).json({
      success: true,
      report: {
        summary,
        byDate,
        byProduct,
        byCategory,
        topOrders,
        sessions
      }
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function exportExcelReport(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const orderFilter = buildOrderFilters(req.query);
    const sessionFilter = buildSessionFilters(req.query);

    const summarySql = `
      SELECT 
        COUNT(o.id) AS total_orders,
        COALESCE(SUM(o.subtotal), 0) AS total_subtotal,
        COALESCE(SUM(o.tax_amount), 0) AS total_tax,
        COALESCE(SUM(o.discount_amount), 0) AS total_discount,
        COALESCE(SUM(o.total_amount), 0) AS total_sales
      FROM orders o
      ${orderFilter.where}
    `;

    const byDateSql = `
      SELECT 
        DATE(o.created_at) AS order_date,
        COUNT(o.id) AS order_count,
        COALESCE(SUM(o.total_amount), 0) AS daily_sales
      FROM orders o
      ${orderFilter.where}
      GROUP BY DATE(o.created_at)
      ORDER BY order_date DESC
    `;

    const byProductSql = `
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
      ${orderFilter.where}
      GROUP BY p.id, p.name, c.name
      ORDER BY total_revenue DESC
    `;

    const sessionsSql = `
      SELECT s.*, u.name AS employee_name
      FROM pos_sessions s
      JOIN users u ON s.employee_id = u.id
      ${sessionFilter.where}
      ORDER BY s.opening_time DESC
    `;

    const [[summary]] = await connection.query(summarySql, orderFilter.params);
    const [byDate] = await connection.query(byDateSql, orderFilter.params);
    const [byProduct] = await connection.query(byProductSql, orderFilter.params);
    const [sessions] = await connection.query(sessionsSql, sessionFilter.params);

    const workbook = new exceljs.Workbook();
    
    // Sheet 1: Summary
    const sheet1 = workbook.addWorksheet("Sales Summary");
    sheet1.columns = [
      { header: "Metric", key: "metric", width: 25 },
      { header: "Value", key: "value", width: 20 }
    ];
    sheet1.addRow({ metric: "Total Orders", value: Number(summary?.total_orders || 0) });
    sheet1.addRow({ metric: "Subtotal Revenue", value: parseFloat(summary?.total_subtotal || 0) });
    sheet1.addRow({ metric: "Total Tax Collected", value: parseFloat(summary?.total_tax || 0) });
    sheet1.addRow({ metric: "Total Discounts Given", value: parseFloat(summary?.total_discount || 0) });
    sheet1.addRow({ metric: "Net Sales Total", value: parseFloat(summary?.total_sales || 0) });

    // Sheet 2: Daily Sales
    const sheet2 = workbook.addWorksheet("Daily Sales");
    sheet2.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Order Count", key: "orders", width: 15 },
      { header: "Revenue", key: "sales", width: 18 }
    ];
    byDate.forEach(row => {
      sheet2.addRow({
        date: row.order_date.toISOString().split("T")[0],
        orders: row.order_count,
        sales: parseFloat(row.daily_sales)
      });
    });

    // Sheet 3: Product sales
    const sheet3 = workbook.addWorksheet("Product Sales Performance");
    sheet3.columns = [
      { header: "Product ID", key: "id", width: 15 },
      { header: "Product Name", key: "name", width: 30 },
      { header: "Category", key: "category", width: 20 },
      { header: "Quantity Sold", key: "quantity", width: 15 },
      { header: "Total Revenue", key: "revenue", width: 18 }
    ];
    byProduct.forEach(row => {
      sheet3.addRow({
        id: row.product_id,
        name: row.product_name,
        category: row.category_name,
        quantity: row.total_quantity,
        revenue: parseFloat(row.total_revenue)
      });
    });

    // Sheet 4: Sessions
    const sheet4 = workbook.addWorksheet("POS Sessions");
    sheet4.columns = [
      { header: "Session ID", key: "id", width: 15 },
      { header: "Employee", key: "employee", width: 25 },
      { header: "Opening Time", key: "open_time", width: 25 },
      { header: "Closing Time", key: "close_time", width: 25 },
      { header: "Opening Cash", key: "open_amount", width: 15 },
      { header: "Closing Cash", key: "close_amount", width: 15 },
      { header: "Status", key: "status", width: 15 }
    ];
    sessions.forEach(row => {
      sheet4.addRow({
        id: row.id,
        employee: row.employee_name,
        open_time: row.opening_time,
        close_time: row.closing_time || "N/A",
        open_amount: parseFloat(row.opening_amount),
        close_amount: parseFloat(row.closing_amount),
        status: row.status
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Odoo_Cafe_POS_Sales_Report.xlsx");

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function exportPDFReport(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const orderFilter = buildOrderFilters(req.query);
    const sessionFilter = buildSessionFilters(req.query);

    const summarySql = `
      SELECT 
        COUNT(o.id) AS total_orders,
        COALESCE(SUM(o.subtotal), 0) AS total_subtotal,
        COALESCE(SUM(o.tax_amount), 0) AS total_tax,
        COALESCE(SUM(o.discount_amount), 0) AS total_discount,
        COALESCE(SUM(o.total_amount), 0) AS total_sales
      FROM orders o
      ${orderFilter.where}
    `;

    const byProductSql = `
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
      ${orderFilter.where}
      GROUP BY p.id, p.name, c.name
      ORDER BY total_revenue DESC
    `;

    const sessionsSql = `
      SELECT s.*, u.name AS employee_name
      FROM pos_sessions s
      JOIN users u ON s.employee_id = u.id
      ${sessionFilter.where}
      ORDER BY s.opening_time DESC
    `;

    const [[summary]] = await connection.query(summarySql, orderFilter.params);
    const [byProduct] = await connection.query(byProductSql, orderFilter.params);
    const [sessions] = await connection.query(sessionsSql, sessionFilter.params);

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=Odoo_Cafe_POS_Sales_Report.pdf");
    
    doc.pipe(res);

    // Document Title
    doc.fontSize(24).fillColor("#2C3E50").text("Odoo Cafe POS - Sales Performance Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).fillColor("#7F8C8D").text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(2);

    // Section 1: Financial Summary
    doc.fontSize(16).fillColor("#2980B9").text("1. Financial Summary");
    doc.strokeColor("#BDC3C7").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(12).fillColor("#2C3E50");
    doc.text(`Total Completed Orders: ${summary?.total_orders || 0}`);
    doc.text(`Subtotal Revenue: $${parseFloat(summary?.total_subtotal || 0).toFixed(2)}`);
    doc.text(`Total Tax Collected: $${parseFloat(summary?.total_tax || 0).toFixed(2)}`);
    doc.text(`Total Discount Deducted: $${parseFloat(summary?.total_discount || 0).toFixed(2)}`);
    doc.text(`Net Total Sales: $${parseFloat(summary?.total_sales || 0).toFixed(2)}`, { stroke: true });
    doc.moveDown(2);

    // Section 2: Best Selling Products
    doc.fontSize(16).fillColor("#2980B9").text("2. Top Product Sales");
    doc.strokeColor("#BDC3C7").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Print top 10 products
    const limit = Math.min(byProduct.length, 10);
    doc.fontSize(10).fillColor("#2C3E50");
    for (let i = 0; i < limit; i++) {
      const prod = byProduct[i];
      doc.text(`${i + 1}. ${prod.product_name} (${prod.category_name}) - Qty: ${prod.total_quantity} | Rev: $${parseFloat(prod.total_revenue).toFixed(2)}`);
    }
    if (byProduct.length === 0) {
      doc.text("No product sales data available.");
    }
    doc.moveDown(2);

    // Section 3: Recent Session Summaries
    doc.fontSize(16).fillColor("#2980B9").text("3. POS Shift Sessions");
    doc.strokeColor("#BDC3C7").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    const limitSessions = Math.min(sessions.length, 5);
    for (let i = 0; i < limitSessions; i++) {
      const s = sessions[i];
      doc.text(`Session #${s.id} | Cashier: ${s.employee_name} | Status: ${s.status}`);
      doc.text(`  Open: $${parseFloat(s.opening_amount).toFixed(2)} (${new Date(s.opening_time).toLocaleString()})`);
      if (s.closing_time) {
        doc.text(`  Close: $${parseFloat(s.closing_amount).toFixed(2)} (${new Date(s.closing_time).toLocaleString()})`);
      } else {
        doc.text(`  Close: Active / Still Open`);
      }
      doc.moveDown(0.5);
    }
    if (sessions.length === 0) {
      doc.text("No session history recorded.");
    }

    doc.end();

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

// User Actions
async function changeEmployeePassword(req, res, next) {
  const { id } = req.params;
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: "Password is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const hashedPassword = await hashPassword(password);
    await connection.query(adminQueries.UPDATE_EMPLOYEE_PASSWORD, [hashedPassword, id]);
    res.status(200).json({ success: true, message: "Employee password changed successfully" });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function archiveEmployee(req, res, next) {
  const { id } = req.params;
  const { is_active } = req.body;

  if (is_active === undefined) {
    return res.status(400).json({ success: false, message: "is_active status is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(adminQueries.SET_EMPLOYEE_ACTIVE_STATUS, [is_active ? 1 : 0, id]);
    res.status(200).json({ success: true, message: `Employee active status updated to ${is_active ? 'active' : 'archived'}` });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

// Settings
async function getSettings(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(adminQueries.GET_ALL_SETTINGS);
    const settings = {};
    rows.forEach(r => {
      settings[r.key_name] = r.key_value;
    });
    res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function updateSettings(req, res, next) {
  const settings = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const [key, val] of Object.entries(settings)) {
      await connection.query(adminQueries.UPDATE_SETTING, [key, val, val]);
    }

    await connection.commit();
    res.status(200).json({ success: true, message: "System settings updated successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function uploadBackgroundImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No background image file uploaded" });
  }
  const imagePath = `/uploads/${req.file.filename}`;
  res.status(200).json({
    success: true,
    message: "Background image uploaded successfully",
    filePath: imagePath
  });
}

async function listPosSessions(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [sessions] = await connection.query(adminQueries.LIST_POS_SESSIONS);
    res.status(200).json({ success: true, sessions });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  // User/Employees
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,

  // Categories
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,

  // Products
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,

  // Floor & Tables
  listFloors,
  createFloor,
  updateFloor,
  deleteFloor,
  listTables,
  createTable,
  updateTable,
  deleteTable,
  getTableQR,

  // Payment Methods
  listPaymentMethods,
  updatePaymentMethod,

  // Coupons
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,

  // Promotions
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,

  // Reports
  getSalesReports,
  exportExcelReport,
  exportPDFReport,

  // Settings
  getSettings,
  updateSettings,
  uploadBackgroundImage,
  listPosSessions,

  // Employee Password / Archiving
  changeEmployeePassword,
  archiveEmployee
};
