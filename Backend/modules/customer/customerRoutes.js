const express = require("express");
const router = express.Router();

const { 
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
} = require("./customerController");

// Public endpoints
router.get("/menu", getCustomerMenu);
router.get("/table/:token", getTableDetails);
router.get("/s/:token", getTableDetails); // Redirect / QR scanned landing URL

// Guest Self-Ordering & tracking
router.post("/orders", placeSelfOrder);
router.get("/orders/:id/status", trackOrderStatus);
router.get("/tables/:token/orders", getCustomerOrderHistory);
router.get("/orders/:id/upi-qr", getCustomerUPIQrCode);
router.post("/orders/:id/razorpay-order", createCustomerRazorpayOrder);
router.post("/orders/:id/razorpay-verify", verifyCustomerRazorpayPayment);
router.post("/orders/:id/pay", payCustomerOrder);
router.post("/apply-coupon", applyCoupon);

// Customer Facing Display Sync
router.get("/display/:tableToken", getCustomerDisplay);

module.exports = router;
