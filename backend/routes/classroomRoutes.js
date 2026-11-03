const express = require("express");
const router = express.Router();
const {
  createClassroom,
  getMyClassrooms,
  getClassroomById,
  updateClassroom,
  getClassroomStudents,
  deleteClassroom,
  joinClassroom,
} = require("../controllers/classroomController");
const {
  createQuestion,
  getClassroomQuestions,
} = require("../controllers/questionController");
const {
  getClassroomAIAnalytics,
  getClassroomStudentsAnalytics,
} = require("../controllers/tutorController");
const {
  protect,
  authorize,
  checkTeacherApproved,
} = require("../middleware/authMiddleware");

// All classroom endpoints require authentication
router.use(protect);

// Student join endpoint (must be defined before /:id)
router.post("/join", authorize("student"), joinClassroom);

// Get my classrooms (Teachers see created; Students see enrolled)
router.get("/my-classrooms", getMyClassrooms);

// Teacher creates classroom
router.post("/", authorize("teacher"), checkTeacherApproved, createClassroom);

// Teacher views student list of classroom
router.get(
  "/:id/students",
  authorize("teacher"),
  checkTeacherApproved,
  getClassroomStudents
);

// Classroom Questions
router.post(
  "/:classroomId/questions",
  authorize("teacher"),
  checkTeacherApproved,
  createQuestion
);

// Get classroom questions (Teacher sees authored; Enrolled student sees safe summaries)
router.get("/:classroomId/questions", getClassroomQuestions);

// Teacher AI Learning Analytics
router.get(
  "/:classroomId/analytics/ai",
  authorize("teacher"),
  checkTeacherApproved,
  getClassroomAIAnalytics
);

// Teacher Student Progress & Hint Performance Analytics
router.get(
  "/:classroomId/analytics/students",
  authorize("teacher"),
  checkTeacherApproved,
  getClassroomStudentsAnalytics
);

// Individual classroom details (Teacher or Enrolled Student)
router.get("/:id", getClassroomById);

// Teacher updates classroom
router.patch(
  "/:id",
  authorize("teacher"),
  checkTeacherApproved,
  updateClassroom
);

// Teacher archives classroom
router.delete(
  "/:id",
  authorize("teacher"),
  checkTeacherApproved,
  deleteClassroom
);

module.exports = router;
