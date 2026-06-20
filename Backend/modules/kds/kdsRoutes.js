const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const { authorize } = require("../../middleware/roleMiddleware");

const {
  listKitchenOrders,
  getKitchenOrderDetail,
  startKitchenOrder,
  completeKitchenOrder,
  completeKitchenItem
} = require("./kdsController");


router.use(protect);
router.use(authorize("EMPLOYEE", "ADMIN"));

router.get("/orders", listKitchenOrders);
router.get("/orders/:id", getKitchenOrderDetail);
router.patch("/orders/:id/start", startKitchenOrder);
router.patch("/orders/:id/complete", completeKitchenOrder);
router.patch("/items/:id/complete", completeKitchenItem);

module.exports = router;
