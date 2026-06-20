/**
 * Helper to validate email format
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}


function validateSignup(req, res, next) {
  const { name, email, password } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ success: false, message: "Name is required" });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "A valid email is required" });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
  }

  next();
}


function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "A valid email is required" });
  }

  if (!password || password.trim() === "") {
    return res.status(400).json({ success: false, message: "Password is required" });
  }

  next();
}


function validateForgotPassword(req, res, next) {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "A valid email is required" });
  }

  next();
}


function validateVerifyOtp(req, res, next) {
  const { email, otp } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "A valid email is required" });
  }

  if (!otp || otp.trim().length !== 6) {
    return res.status(400).json({ success: false, message: "OTP must be exactly 6 characters" });
  }

  next();
}


function validateResetPassword(req, res, next) {
  const { email, password } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "A valid email is required" });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" });
  }

  next();
}

module.exports = {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateVerifyOtp,
  validateResetPassword
};
