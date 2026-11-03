const express = require("express");
const router = express.Router();
const {
  getPendingTeachers,
  getAllTeachers,
  approveTeacher,
  rejectTeacher,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All admin routes require authentication and the 'admin' role
router.use(protect);
router.use(authorize("admin"));

router.get("/teachers/pending", getPendingTeachers);
router.get("/teachers", getAllTeachers);
router.patch("/teachers/:id/approve", approveTeacher);
router.patch("/teachers/:id/reject", rejectTeacher);

module.exports = router;
