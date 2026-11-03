const express = require("express");
const router = express.Router();
const { getHint } = require("../controllers/tutorController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All tutor endpoints require authentication and student role
router.use(protect);
router.post("/hint", authorize("student"), getHint);

module.exports = router;
