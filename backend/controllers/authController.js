const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// @desc    Register a student or teacher
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    if (role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Public admin registration is strictly prohibited",
      });
    }

    const assignedRole = role === "teacher" ? "teacher" : "student";

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email address already exists",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: assignedRole,
      status: assignedRole === "teacher" ? "pending" : "active",
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message:
        assignedRole === "teacher"
          ? "Teacher registered successfully. Your account is pending administrator approval."
          : "Student registered successfully.",
      token: assignedRole === "teacher" ? null : token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Role-specific status validation
    if (user.role === "teacher") {
      if (user.status === "pending") {
        return res.status(403).json({
          success: false,
          status: "pending",
          message:
            "Your teacher account is pending administrator approval. Please wait for an administrator to approve your account.",
        });
      }

      if (user.status === "rejected") {
        return res.status(403).json({
          success: false,
          status: "rejected",
          message:
            "Your teacher registration has been rejected by an administrator. Please contact support.",
        });
      }

      if (user.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: `Your account is not approved. Status: ${user.status}`,
        });
      }
    } else {
      // Students and Admins must be active
      if (user.status !== "active") {
        return res.status(403).json({
          success: false,
          message: `Your account status is ${user.status}. Please contact an administrator.`,
        });
      }
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

// @desc    One-time setup for the initial administrator
// @route   POST /api/auth/setup-admin
// @access  Protected by ADMIN_SETUP_SECRET
const setupAdmin = async (req, res, next) => {
  try {
    const { name, email, password, adminSetupSecret } = req.body;
    const providedSecret =
      adminSetupSecret || req.headers["x-admin-setup-secret"];

    const serverSecret = process.env.ADMIN_SETUP_SECRET;

    if (!serverSecret || !providedSecret || providedSecret !== serverSecret) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Invalid or missing administrator setup secret",
      });
    }

    // Ensure an admin does not already exist
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Initial admin account has already been created. One-time setup is permanently disabled.",
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password for admin setup",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const admin = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "admin",
      status: "active",
    });

    const token = generateToken(admin._id);

    return res.status(201).json({
      success: true,
      message: "Initial administrator account created successfully",
      token,
      user: admin,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  setupAdmin,
};
