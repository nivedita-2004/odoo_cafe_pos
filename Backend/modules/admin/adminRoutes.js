const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const { authorize } = require("../../middleware/roleMiddleware");

// Setup uploads folder if not exists
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `bg_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Error: Only jpeg, jpg, png, or webp images are allowed!"));
  }
});

const {
  // Employees
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  changeEmployeePassword,
  archiveEmployee,

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

  // Floors & Tables
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
  listPosSessions
} = require("./adminController");

// Apply Auth and Role checks globally to all admin routes
router.use(protect);
router.use(authorize("ADMIN"));

// Employees
router.get("/employees", listEmployees);
router.post("/employees", createEmployee);
router.put("/employees/:id", updateEmployee);
router.delete("/employees/:id", deleteEmployee);
router.put("/employees/:id/password", changeEmployeePassword);
router.put("/employees/:id/archive", archiveEmployee);

// Categories
router.get("/categories", listCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// Products
router.get("/products", listProducts);
router.post("/products", upload.single("image"), createProduct);
router.put("/products/:id", upload.single("image"), updateProduct);
router.delete("/products/:id", deleteProduct);

// Floors
router.get("/floors", listFloors);
router.post("/floors", createFloor);
router.put("/floors/:id", updateFloor);
router.delete("/floors/:id", deleteFloor);

// Tables
router.get("/tables", listTables);
router.post("/tables", createTable);
router.put("/tables/:id", updateTable);
router.delete("/tables/:id", deleteTable);
router.get("/tables/:token/qr", getTableQR);

// Payment Methods
router.get("/payment-methods", listPaymentMethods);
router.put("/payment-methods/:id", updatePaymentMethod);

// Coupons
router.get("/coupons", listCoupons);
router.post("/coupons", createCoupon);
router.put("/coupons/:id", updateCoupon);
router.delete("/coupons/:id", deleteCoupon);

// Promotions
router.get("/promotions", listPromotions);
router.post("/promotions", createPromotion);
router.put("/promotions/:id", updatePromotion);
router.delete("/promotions/:id", deletePromotion);

// Reports
router.get("/reports/sales", getSalesReports);
router.get("/reports/export/excel", exportExcelReport);
router.get("/reports/export/pdf", exportPDFReport);

// System Settings
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.post("/settings/upload", upload.single("image"), uploadBackgroundImage);

// POS Sessions
router.get("/pos-sessions", listPosSessions);

module.exports = router;
