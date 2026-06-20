const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const { authorize } = require("../../middleware/roleMiddleware");

const {
  getActiveSession,
  getLastSession,
  openSession,
  closeSession,
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createOrder,
  getOrder,
  updateOrder,
  updateOrderStatus,
  getUPIQrCode,
  payOrder,
  getReceiptPDF,
  listOrders,
  sendToKitchen
} = require("./employeeController");

// Restrict these routes to authenticated cashiers (EMPLOYEE) and ADMINs
router.use(protect);
router.use(authorize("EMPLOYEE", "ADMIN"));

// Shift sessions control
router.get("/sessions/active", getActiveSession);
router.get("/sessions/last", getLastSession);
router.post("/sessions/open", openSession);
router.post("/sessions/:id/close", closeSession);

// Customers list/create/update/delete
router.get("/customers", searchCustomers);
router.post("/customers", createCustomer);
router.put("/customers/:id", updateCustomer);
router.delete("/customers/:id", deleteCustomer);

// POS Orders
router.get("/orders", listOrders);
router.post("/orders", createOrder);
router.get("/orders/:id", getOrder);
router.put("/orders/:id", updateOrder);
router.put("/orders/:id/status", updateOrderStatus);
router.post("/orders/:id/send-to-kitchen", sendToKitchen);

// Payment processing
router.get("/orders/:id/upi-qr", getUPIQrCode);
router.post("/orders/:id/pay", payOrder);
router.get("/orders/:id/receipt", getReceiptPDF);

module.exports = router;
