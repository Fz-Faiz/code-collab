const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token provided",
    });
  }

  try {
    const secret = process.env.JWT_SECRET || "default_jwt_secret_dev";
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Not authorized, token invalid or expired",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role || "unknown"}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

const checkTeacherApproved = (req, res, next) => {
  if (req.user.role !== "teacher" || req.user.status !== "approved") {
    return res.status(403).json({
      success: false,
      message: `Teacher account is not approved. Current status: ${req.user.status}`,
    });
  }
  next();
};

module.exports = {
  protect,
  authorize,
  checkTeacherApproved,
};
