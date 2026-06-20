const express = require("express");
const router = express.Router();

const { 
  getCustomerMenu, 
  getTableDetails, 
  placeSelfOrder, 
  trackOrderStatus, 
  getCustomerDisplay,
  applyCoupon
} = require("./customerController");

// Public endpoints
router.get("/menu", getCustomerMenu);
router.get("/table/:token", getTableDetails);
router.get("/s/:token", getTableDetails); // Redirect / QR scanned landing URL

// Guest Self-Ordering & tracking
router.post("/orders", placeSelfOrder);
router.get("/orders/:id/status", trackOrderStatus);
router.post("/apply-coupon", applyCoupon);

// Customer Facing Display Sync
router.get("/display/:tableToken", getCustomerDisplay);

module.exports = router;
