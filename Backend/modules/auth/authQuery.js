module.exports = {
  FIND_USER_BY_EMAIL: `
    SELECT * FROM users 
    WHERE email = ? AND is_deleted = 0
  `,

  CREATE_USER: `
    INSERT INTO users (name, email, password, role, is_active) 
    VALUES (?, ?, ?, ?, ?)
  `,

  STORE_OTP: `
    INSERT INTO password_resets (user_id, otp, expires_at, verified) 
    VALUES (?, ?, ?, 0)
  `,

  FIND_VALID_OTP: `
    SELECT * FROM password_resets 
    WHERE user_id = ? AND otp = ? AND expires_at > NOW() AND verified = 0
  `,

  MARK_OTP_VERIFIED: `
    UPDATE password_resets 
    SET verified = 1 
    WHERE id = ?
  `,

  CHECK_OTP_VERIFIED: `
    SELECT * FROM password_resets 
    WHERE user_id = ? AND verified = 1 AND expires_at > NOW() 
    ORDER BY created_at DESC LIMIT 1
  `,

  UPDATE_PASSWORD: `
    UPDATE users 
    SET password = ? 
    WHERE id = ?
  `,

  CLEAR_USER_OTP: `
    DELETE FROM password_resets 
    WHERE user_id = ?
  `
};
