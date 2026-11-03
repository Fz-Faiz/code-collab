const mongoose = require("mongoose");
const Question = require("../models/Question");
const Classroom = require("../models/Classroom");
const ClassroomMembership = require("../models/ClassroomMembership");
const Submission = require("../models/Submission");
const oneCompilerService = require("../services/oneCompilerService");
const {
  evaluateSubmission,
  normalizeOutput,
  compareOutput,
  classifyError,
  isExecutionFailure,
} = require("../services/evaluationService");

// @desc    Submit solution for automated evaluation
// @route   POST /api/questions/:questionId/submit
// @access  Private (Authenticated Student enrolled in classroom)
const submitSolution = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { code, language, classroomId } = req.body;

    // Security check: Only students can submit solutions as students
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can submit solutions to classroom coding problems",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question ID format",
      });
    }

    if (!classroomId || !mongoose.Types.ObjectId.isValid(classroomId)) {
      return res.status(400).json({
        success: false,
        message: "Valid classroom ID is required",
      });
    }

    // Find question
    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      return res.status(404).json({
        success: false,
        message: "Question not found or is no longer active",
      });
    }

    // Verify question belongs to the specified classroom
    if (!question.classroom.equals(classroomId)) {
      return res.status(400).json({
        success: false,
        message: "Question does not belong to the specified classroom",
      });
    }

    // Verify student is enrolled in the classroom
    const membership = await ClassroomMembership.findOne({
      classroom: classroomId,
      student: req.user._id,
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this classroom to submit solutions",
      });
    }

    // Validate language
    if (!language || !question.supportedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: `Language '${language}' is not supported for this question. Supported: ${question.supportedLanguages.join(", ")}`,
      });
    }

    // Validate code
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Submission code is required and cannot be empty",
      });
    }

    // Perform automated evaluation on backend
    const evalResult = await evaluateSubmission({
      question,
      code,
      language,
    });

    // Save submission record
    const submission = await Submission.create({
      student: req.user._id,
      classroom: question.classroom,
      question: question._id,
      code,
      language,
      verdict: evalResult.verdict,
      totalTestCases: evalResult.totalTestCases,
      passedTestCases: evalResult.passedTestCases,
      failedTestCases: evalResult.failedTestCases,
      testResults: evalResult.testResults,
      errorMessage: evalResult.errorMessage,
    });

    return res.status(201).json({
      success: true,
      message: "Solution evaluated successfully",
      submission: {
        _id: submission._id,
        verdict: submission.verdict,
        totalTestCases: submission.totalTestCases,
        passedTestCases: submission.passedTestCases,
        failedTestCases: submission.failedTestCases,
        language: submission.language,
        createdAt: submission.createdAt,
        errorMessage: submission.errorMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get submission history for the logged-in student for a question
// @route   GET /api/questions/:questionId/submissions
// @access  Private (Authenticated Student enrolled in classroom)
const getQuestionSubmissions = async (req, res, next) => {
  try {
    const { questionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question ID format",
      });
    }

    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Enrolled student access verification
    if (req.user.role === "student") {
      const isEnrolled = await ClassroomMembership.exists({
        classroom: question.classroom,
        student: req.user._id,
      });

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this question's classroom",
        });
      }
    }

    // Students only ever see their own submissions
    const query = {
      question: questionId,
      student: req.user._id,
    };

    const submissions = await Submission.find(query)
      .sort({ createdAt: -1 })
      .select("-code -testResults") // summary list
      .lean();

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get submission details by ID
// @route   GET /api/submissions/:submissionId
// @access  Private (Student owner or authorized teacher/admin)
const getSubmissionById = async (req, res, next) => {
  try {
    const { submissionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format",
      });
    }

    const submission = await Submission.findById(submissionId).populate(
      "question",
      "title difficulty"
    );

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Security: Students can only view their own submissions
    if (
      req.user.role === "student" &&
      !submission.student.equals(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view another student's submission",
      });
    }

    // Teachers can only view submissions from their classrooms
    if (req.user.role === "teacher") {
      const classroom = await Classroom.findById(submission.classroom);
      if (!classroom || !classroom.teacher.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view this classroom's submissions",
        });
      }
    }

    return res.status(200).json({
      success: true,
      submission: submission.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run code against visible sample test cases or custom input
// @route   POST /api/questions/:questionId/run
// @access  Private (Enrolled Student, Classroom Teacher, Admin)
const runCode = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { code, language, customInput } = req.body;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question ID format",
      });
    }

    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Authorization check
    if (req.user.role === "student") {
      const isEnrolled = await ClassroomMembership.exists({
        classroom: question.classroom,
        student: req.user._id,
      });

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this question's classroom",
        });
      }
    } else if (req.user.role === "teacher") {
      const classroom = await Classroom.findById(question.classroom);
      if (!classroom || !classroom.teacher.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You do not own this classroom",
        });
      }
    }

    // Validate language
    if (!language || !question.supportedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: `Language '${language}' is not supported. Supported: ${question.supportedLanguages.join(", ")}`,
      });
    }

    // Validate code
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Code is required and cannot be empty",
      });
    }

    // Case 1: Custom input execution
    if (customInput !== undefined && customInput !== null) {
      let result;
      try {
        result = await oneCompilerService.executeCode({
          code,
          language,
          input: String(customInput),
        });
      } catch (err) {
        return res.status(502).json({
          success: false,
          message: `Code execution service error: ${err.message}`,
        });
      }

      return res.status(200).json({
        success: true,
        runType: "custom",
        result: {
          stdout: result.stdout || "",
          stderr: result.stderr || "",
          exception: result.exception || null,
          executionTime: result.executionTime || 0,
        },
      });
    }

    // Case 2: Visible sample test cases execution
    const sampleTests = question.sampleTestCases || [];
    const sampleResults = [];

    for (let i = 0; i < sampleTests.length; i++) {
      const tc = sampleTests[i];
      let result;

      try {
        result = await oneCompilerService.executeCode({
          code,
          language,
          input: tc.input || "",
        });
      } catch (err) {
        sampleResults.push({
          testIndex: i + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: "",
          passed: false,
          status: "Provider Error",
          error: err.message,
        });
        continue;
      }

      const hasFailure = isExecutionFailure(result, language);

      if (hasFailure) {
        const errorCategory = classifyError(result, language);
        sampleResults.push({
          testIndex: i + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: "",
          passed: false,
          status: errorCategory,
          error: (result.stderr || result.exception || "").trim(),
          executionTime: result.executionTime || 0,
        });
      } else {
        const isMatch = compareOutput(result.stdout || "", tc.expectedOutput);
        sampleResults.push({
          testIndex: i + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: result.stdout || "",
          passed: isMatch,
          status: isMatch ? "Passed" : "Wrong Answer",
          executionTime: result.executionTime || 0,
        });
      }
    }

    return res.status(200).json({
      success: true,
      runType: "sample",
      results: sampleResults,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitSolution,
  getQuestionSubmissions,
  getSubmissionById,
  runCode,
};
