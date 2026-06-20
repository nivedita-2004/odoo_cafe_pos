const jwt = require("jsonwebtoken");
require("dotenv").config();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "access_secret_12345";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET ? process.env.JWT_SECRET + "_refresh" : "refresh_secret_12345");

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || "7d";


function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
}


function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
}


function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (error) {
    return null;
  }
}


function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
