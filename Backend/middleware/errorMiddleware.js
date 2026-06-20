const errorHandler = (err, req, res, next) => {
  console.error("Error occurred:", err);

  const statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Handle MySQL duplicate entry error
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry error: A record with this key already exists."
    });
  }

  // Handle MySQL foreign key constraint failure
  if (err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(400).json({
      success: false,
      message: "Foreign key constraint failure: Referenced record not found or cannot delete parent record."
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack
  });
};

module.exports = errorHandler;
