const { pool } = require("../../config/db");
const { hashPassword, comparePassword } = require("../../utils/passwordUtils");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../../utils/tokenUtils");
const authQueries = require("./authQuery");
const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "your_email@gmail.com",
    pass: process.env.EMAIL_PASS || "your_app_password"
  }
});


async function sendOTPEmail(email, otp) {
  const mailOptions = {
    from: `"Odoo Cafe POS Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Password Reset OTP - Odoo Cafe POS",
    html: `
      <h3>Odoo Cafe POS Password Reset Request</h3>
      <p>Hello,</p>
      <p>You requested a password reset for your account. Please use the following 6-digit One Time Password (OTP) to verify your request:</p>
      <h2 style="color: #4A90E2; letter-spacing: 2px;">${otp}</h2>
      <p>This OTP is valid for 10 minutes. If you did not initiate this request, you can safely ignore this email.</p>
      <br/>
      <p>Best regards,</p>
      <p>Odoo Cafe POS Team</p>
    `
  };

  try {
    
    if (process.env.EMAIL_USER === "your_email@gmail.com" || !process.env.EMAIL_USER) {
      throw new Error("SMTP credentials not configured.");
    }
    await transporter.sendMail(mailOptions);
    console.log(`OTP Email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.log(`[LOCAL DEV] FAILED TO SEND EMAIL: ${error.message}`);
    console.log(`[LOCAL DEV] PASSWORD RESET OTP FOR ${email}: ${otp}`);
    
    return false;
  }
}


async function signup(req, res, next) {
  const { name, email, password } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Check if email already exists
    const [existing] = await connection.query(authQueries.FIND_USER_BY_EMAIL, [email]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered"
      });
    }

    const hashedPassword = await hashPassword(password);
    
    // Default signup is ADMIN (User)
    const role = "ADMIN";
    const isActive = 1;

    const [result] = await connection.query(authQueries.CREATE_USER, [
      name,
      email,
      hashedPassword,
      role,
      isActive
    ]);

    const userId = result.insertId;
    const user = { id: userId, name, email, role };

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      accessToken,
      refreshToken,
      user
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}


async function login(req, res, next) {
  const { email, password } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();

    const [users] = await connection.query(authQueries.FIND_USER_BY_EMAIL, [email]);
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact the administrator."
      });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: userPayload
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}


async function refreshToken(req, res, next) {
  const token = req.body.refreshToken || req.headers["x-refresh-token"];

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Refresh token is required"
    });
  }

  let connection;
  try {
    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token"
      });
    }

    connection = await pool.getConnection();
    const [users] = await connection.query("SELECT * FROM users WHERE id = ? AND is_deleted = 0", [decoded.id]);
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User account not found"
      });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated"
      });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const newAccessToken = generateAccessToken(userPayload);
    const newRefreshToken = generateRefreshToken(userPayload);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}


async function forgotPassword(req, res, next) {
  const { email } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();

    const [users] = await connection.query(authQueries.FIND_USER_BY_EMAIL, [email]);
    if (users.length === 0) {
      return res.status(444).json({
        success: false,
        message: "No account registered with this email address"
      });
    }

    const user = users[0];

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    // Clear old OTPs
    await connection.query(authQueries.CLEAR_USER_OTP, [user.id]);

    // Store new OTP
    await connection.query(authQueries.STORE_OTP, [user.id, otp, expiresAt]);

    // Send email (falls back to logging to terminal if SMTP not config'd)
    const emailSent = await sendOTPEmail(email, otp);

    res.status(200).json({
      success: true,
      message: emailSent 
        ? "Password reset OTP sent to your email." 
        : "OTP generated successfully (logged to server console in development)."
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}


async function verifyOtp(req, res, next) {
  const { email, otp } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();

    const [users] = await connection.query(authQueries.FIND_USER_BY_EMAIL, [email]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = users[0];

    // Verify OTP exists and is valid
    const [rows] = await connection.query(authQueries.FIND_VALID_OTP, [user.id, otp]);
    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP code"
      });
    }

    const otpRecord = rows[0];

    // Mark OTP as verified
    await connection.query(authQueries.MARK_OTP_VERIFIED, [otpRecord.id]);

    res.status(200).json({
      success: true,
      message: "OTP verified successfully. You may now reset your password."
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}


async function resetPassword(req, res, next) {
  const { email, password } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();

    const [users] = await connection.query(authQueries.FIND_USER_BY_EMAIL, [email]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = users[0];

    // Check if there is an OTP verified in the last 10 minutes
    const [verifications] = await connection.query(authQueries.CHECK_OTP_VERIFIED, [user.id]);
    if (verifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Access denied. Please verify your OTP code first."
      });
    }

    // Update password
    const hashedPassword = await hashPassword(password);
    await connection.query(authQueries.UPDATE_PASSWORD, [hashedPassword, user.id]);

    // Clear reset records
    await connection.query(authQueries.CLEAR_USER_OTP, [user.id]);

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password."
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
}


function logout(req, res) {
  res.status(200).json({
    success: true,
    message: "Logged out successfully"
  });
}

module.exports = {
  signup,
  login,
  refreshToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
  logout
};
