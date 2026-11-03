const express = require("express");
const router = express.Router();
const { getSubmissionById } = require("../controllers/submissionController");
const { protect } = require("../middleware/authMiddleware");

// All submission routes require authentication
router.use(protect);

// Get submission details
router.get("/:submissionId", getSubmissionById);

module.exports = router;
