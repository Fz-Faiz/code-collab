const mongoose = require("mongoose");
const User = require("../models/User");

// @desc    Get all pending teacher accounts
// @route   GET /api/admin/teachers/pending
// @access  Private (Admin only)
const getPendingTeachers = async (req, res, next) => {
  try {
    const pendingTeachers = await User.find({
      role: "teacher",
      status: "pending",
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: pendingTeachers.length,
      teachers: pendingTeachers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all teacher accounts and their approval statuses
// @route   GET /api/admin/teachers
// @access  Private (Admin only)
const getAllTeachers = async (req, res, next) => {
  try {
    const teachers = await User.find({
      role: "teacher",
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: teachers.length,
      teachers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a pending teacher account
// @route   PATCH /api/admin/teachers/:id/approve
// @access  Private (Admin only)
const approveTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID format",
      });
    }

    const teacher = await User.findById(id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher account not found",
      });
    }

    if (teacher.role !== "teacher") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve user with role '${teacher.role}'`,
      });
    }

    teacher.status = "approved";
    await teacher.save();

    return res.status(200).json({
      success: true,
      message: `Teacher ${teacher.name} has been approved successfully`,
      teacher,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a pending teacher account
// @route   PATCH /api/admin/teachers/:id/reject
// @access  Private (Admin only)
const rejectTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID format",
      });
    }

    const teacher = await User.findById(id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher account not found",
      });
    }

    if (teacher.role !== "teacher") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject user with role '${teacher.role}'`,
      });
    }

    teacher.status = "rejected";
    await teacher.save();

    return res.status(200).json({
      success: true,
      message: `Teacher ${teacher.name} has been rejected`,
      teacher,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingTeachers,
  getAllTeachers,
  approveTeacher,
  rejectTeacher,
};
