const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const { authorize } = require("../../middleware/roleMiddleware");

const {
  getDashboardStats,
  getTopProducts,
  getTopCategories,
  getTopOrders,
  getSalesTrend,
  getAdminDashboard
} = require("./reportController");

router.use(protect);
router.use(authorize("ADMIN"));

router.get("/dashboard", getDashboardStats);
router.get("/admin-dashboard", getAdminDashboard);
router.get("/top-products", getTopProducts);
router.get("/top-categories", getTopCategories);
router.get("/top-orders", getTopOrders);
router.get("/sales-trend", getSalesTrend);

module.exports = router;
