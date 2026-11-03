const express = require("express");
const router = express.Router();
const {
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} = require("../controllers/questionController");
const {
  submitSolution,
  getQuestionSubmissions,
  runCode,
} = require("../controllers/submissionController");
const {
  protect,
  authorize,
  checkTeacherApproved,
} = require("../middleware/authMiddleware");

// All question endpoints require authentication
router.use(protect);

// Student submission & evaluation endpoints
router.post("/:questionId/submit", authorize("student"), submitSolution);
router.get("/:questionId/submissions", authorize("student"), getQuestionSubmissions);
router.post("/:questionId/run", runCode);

// Question detail (Role-based: Teacher gets full details, Student gets safe DTO)
router.get("/:questionId", getQuestionById);

// Teacher-only modification endpoints
router.patch("/:questionId", authorize("teacher"), checkTeacherApproved, updateQuestion);
router.delete("/:questionId", authorize("teacher"), checkTeacherApproved, deleteQuestion);

module.exports = router;
