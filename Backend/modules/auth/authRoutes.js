const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  refreshToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
  logout
} = require("./authController");

const {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateVerifyOtp,
  validateResetPassword
} = require("./authValidation");

router.post("/signup", validateSignup, signup);
router.post("/login", validateLogin, login);
router.post("/refresh", refreshToken);
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/verify-otp", validateVerifyOtp, verifyOtp);
router.post("/reset-password", validateResetPassword, resetPassword);
router.post("/logout", logout);

module.exports = router;
