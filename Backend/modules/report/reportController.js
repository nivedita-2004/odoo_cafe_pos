const { pool } = require("../../config/db");
const reportQueries = require("./reportQuery");

async function getDashboardStats(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(reportQueries.GET_DASHBOARD_STATS);
    const stats = rows[0];

    res.status(200).json({
      success: true,
      stats: {
        totalOrders: stats.totalOrders || 0,
        totalRevenue: parseFloat(parseFloat(stats.totalRevenue).toFixed(2)),
        averageOrderValue: parseFloat(parseFloat(stats.averageOrderValue).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function getTopProducts(req, res, next) {
  const limit = parseInt(req.query.limit) || 10;
  let connection;
  try {
    connection = await pool.getConnection();
    const [products] = await connection.query(reportQueries.GET_TOP_PRODUCTS, [limit]);
    
    // Parse decimals
    products.forEach(p => {
      p.quantity_sold = parseInt(p.quantity_sold);
      p.revenue = parseFloat(parseFloat(p.revenue).toFixed(2));
    });

    res.status(200).json({ success: true, products });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function getTopCategories(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [categories] = await connection.query(reportQueries.GET_TOP_CATEGORIES);
    
    categories.forEach(c => {
      c.revenue = parseFloat(parseFloat(c.revenue).toFixed(2));
    });

    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function getTopOrders(req, res, next) {
  const limit = parseInt(req.query.limit) || 5;
  let connection;
  try {
    connection = await pool.getConnection();
    const [orders] = await connection.query(reportQueries.GET_TOP_ORDERS, [limit]);
    
    orders.forEach(o => {
      o.total_amount = parseFloat(parseFloat(o.total_amount).toFixed(2));
    });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function getSalesTrend(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [trend] = await connection.query(reportQueries.GET_SALES_TREND);
    
    trend.forEach(t => {
      t.order_count = parseInt(t.order_count);
      t.revenue = parseFloat(parseFloat(t.revenue).toFixed(2));
    });

    res.status(200).json({ success: true, trend });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  getDashboardStats,
  getTopProducts,
  getTopCategories,
  getTopOrders,
  getSalesTrend
};
