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

const toNumber = (value) => Number.parseFloat(value || 0)

const toInt = (value) => Number.parseInt(value || 0, 10)

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-"

const paymentLabel = (label) =>
  ({
    CARD: "Card",
    UPI: "UPI",
    CASH: "Cash",
    RAZORPAY: "Razorpay"
  })[label] || label || "-"

async function getAdminDashboard(req, res, next) {
  let connection;
  try {
    connection = await pool.getConnection();

    const [[summary]] = await connection.query(reportQueries.ADMIN_DASHBOARD_SUMMARY);
    const [salesTrend] = await connection.query(reportQueries.ADMIN_DASHBOARD_SALES_TREND);
    const [paymentRows] = await connection.query(reportQueries.ADMIN_DASHBOARD_PAYMENT_SUMMARY);
    const [topProducts] = await connection.query(reportQueries.ADMIN_DASHBOARD_TOP_PRODUCTS);
    const [topCategories] = await connection.query(reportQueries.ADMIN_DASHBOARD_TOP_CATEGORIES);
    const [recentOrders] = await connection.query(reportQueries.ADMIN_DASHBOARD_RECENT_ORDERS);
    const [kitchenRows] = await connection.query(reportQueries.ADMIN_DASHBOARD_KITCHEN_STATUS);
    const [[tableOccupancy]] = await connection.query(reportQueries.ADMIN_DASHBOARD_TABLE_OCCUPANCY);

    const kitchenMap = kitchenRows.reduce((result, row) => {
      result[row.status] = toInt(row.value);
      return result;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOrders: toInt(summary.totalOrders),
          totalRevenue: toNumber(summary.totalRevenue),
          averageOrderValue: toNumber(summary.averageOrderValue),
          todaysOrders: toInt(summary.todaysOrders),
          pendingKitchenOrders: toInt(summary.pendingKitchenOrders),
          activeTables: toInt(summary.activeTables),
          totalProducts: toInt(summary.totalProducts),
          activeEmployees: toInt(summary.activeEmployees)
        },
        salesTrend: salesTrend.map((item) => ({
          day: item.day,
          amount: toNumber(item.amount)
        })),
        paymentSummary: paymentRows.map((item) => ({
          label: paymentLabel(item.label),
          amount: toNumber(item.amount)
        })),
        topProducts: topProducts.map((item) => ({
          name: item.name,
          category: item.category,
          quantity: toInt(item.quantity),
          revenue: toNumber(item.revenue)
        })),
        topCategories: topCategories.map((item) => ({
          category: item.category,
          color: item.color || "#c8793f",
          revenue: toNumber(item.revenue)
        })),
        recentOrders: recentOrders.map((order) => ({
          orderNo: order.orderNo,
          table: order.tableNumber ? `T${order.tableNumber}` : "-",
          customer: order.customer || "Walk-in",
          employee: order.employee || "-",
          amount: toNumber(order.amount),
          paymentMethod: order.paymentMethod || "-",
          status: order.status,
          time: formatTime(order.createdAt)
        })),
        kitchenStatus: [
          { label: "To Cook", value: kitchenMap.TO_COOK || 0 },
          { label: "Preparing", value: kitchenMap.PREPARING || 0 },
          { label: "Completed", value: kitchenMap.COMPLETED || 0 }
        ],
        tableOccupancy: {
          totalTables: toInt(tableOccupancy.totalTables),
          activeTables: toInt(tableOccupancy.activeTables),
          availableTables: Math.max(toInt(tableOccupancy.availableTables), 0)
        }
      }
    });
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
  getSalesTrend,
  getAdminDashboard
};
