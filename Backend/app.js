const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorMiddleware");
// Import Routes
const authRoutes = require("./modules/auth/authRoutes");
const adminRoutes = require("./modules/admin/adminRoutes");
const employeeRoutes = require("./modules/employee/employeeRoutes");
const customerRoutes = require("./modules/customer/customerRoutes");
const kdsRoutes = require("./modules/kds/kdsRoutes");
const reportRoutes = require("./modules/report/reportRoutes");

const app = express();



app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/uploads", express.static(path.join(__dirname, "uploads")));


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 300, 
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes."
  }
});
app.use("/api/", limiter);


// Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/kds", kdsRoutes);
app.use("/api/reports", reportRoutes);


app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "UP", timestamp: new Date() });
});


app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found on path ${req.originalUrl}`
  });
});


app.use(errorHandler);

module.exports = app;
