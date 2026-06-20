
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user credentials missing"
      });
    }

    const hasRole = roles.map(r => r.toUpperCase()).includes(req.user.role.toUpperCase());

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access is denied for role '${req.user.role}'`
      });
    }

    next();
  };
};

module.exports = { authorize };
