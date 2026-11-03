const mongoose = require("mongoose");
const Question = require("../models/Question");
const Classroom = require("../models/Classroom");
const ClassroomMembership = require("../models/ClassroomMembership");
const Submission = require("../models/Submission");

// @desc    Create a new question for a specific classroom
// @route   POST /api/classrooms/:classroomId/questions
// @access  Private (Approved Teacher owning the classroom)
const createQuestion = async (req, res, next) => {
  try {
    const { classroomId } = req.params;
    const {
      title,
      description,
      inputFormat,
      outputFormat,
      constraints,
      difficulty,
      supportedLanguages,
      sampleTestCases,
      hiddenTestCases,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classroomId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid classroom ID format",
      });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: "Classroom not found",
      });
    }

    if (
      !classroom.teacher.equals(req.user._id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to create questions in this classroom",
      });
    }

    // Required fields validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question title is required",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Problem description is required",
      });
    }

    if (!inputFormat || !inputFormat.trim()) {
      return res.status(400).json({
        success: false,
        message: "Input format is required",
      });
    }

    if (!outputFormat || !outputFormat.trim()) {
      return res.status(400).json({
        success: false,
        message: "Output format is required",
      });
    }

    // Difficulty validation
    const validDifficulties = ["Easy", "Medium", "Hard"];
    const assignedDifficulty = difficulty || "Medium";
    if (!validDifficulties.includes(assignedDifficulty)) {
      return res.status(400).json({
        success: false,
        message: `Difficulty must be one of: ${validDifficulties.join(", ")}`,
      });
    }

    // Supported languages validation
    const validLanguages = ["cpp", "java", "python", "javascript"];
    const assignedLanguages = supportedLanguages || validLanguages;
    if (
      !Array.isArray(assignedLanguages) ||
      assignedLanguages.length === 0 ||
      !assignedLanguages.every((l) => validLanguages.includes(l))
    ) {
      return res.status(400).json({
        success: false,
        message: `Supported languages must only contain valid options: ${validLanguages.join(", ")}`,
      });
    }

    // Test cases validation
    if (
      !Array.isArray(sampleTestCases) ||
      sampleTestCases.length === 0 ||
      !sampleTestCases.every(
        (tc) =>
          tc &&
          typeof tc.expectedOutput === "string" &&
          tc.expectedOutput.trim().length > 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one sample test case with expected output is required",
      });
    }

    if (
      !Array.isArray(hiddenTestCases) ||
      hiddenTestCases.length === 0 ||
      !hiddenTestCases.every(
        (tc) =>
          tc &&
          typeof tc.expectedOutput === "string" &&
          tc.expectedOutput.trim().length > 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one hidden test case with expected output is required",
      });
    }

    // Normalize test case objects (trim whitespace)
    const normalizedSampleTestCases = sampleTestCases.map((tc) => ({
      input: tc.input || "",
      expectedOutput: tc.expectedOutput.trim(),
    }));

    const normalizedHiddenTestCases = hiddenTestCases.map((tc) => ({
      input: tc.input || "",
      expectedOutput: tc.expectedOutput.trim(),
    }));

    const question = await Question.create({
      title: title.trim(),
      description: description.trim(),
      inputFormat: inputFormat.trim(),
      outputFormat: outputFormat.trim(),
      constraints: constraints ? constraints.trim() : "",
      difficulty: assignedDifficulty,
      supportedLanguages: assignedLanguages,
      classroom: classroom._id,
      createdBy: req.user._id,
      sampleTestCases: normalizedSampleTestCases,
      hiddenTestCases: normalizedHiddenTestCases,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Question created successfully",
      question,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all questions for a specific classroom
// @route   GET /api/classrooms/:classroomId/questions
// @access  Private (Teacher of classroom OR Enrolled Student)
const getClassroomQuestions = async (req, res, next) => {
  try {
    const { classroomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classroomId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid classroom ID format",
      });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: "Classroom not found",
      });
    }

    // Role-based authorization & response serialization
    if (req.user.role === "student") {
      // Verify enrollment
      const isEnrolled = await ClassroomMembership.exists({
        classroom: classroomId,
        student: req.user._id,
      });

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this classroom",
        });
      }

      // Fetch active questions only
      const questions = await Question.find({
        classroom: classroomId,
        isActive: true,
      })
        .select("-hiddenTestCases") // Never leak hidden test cases
        .sort({ createdAt: 1 });

      // Calculate solving status for each question based on student's submissions
      const questionIds = questions.map((q) => q._id);
      const studentSubmissions = await Submission.find({
        student: req.user._id,
        question: { $in: questionIds },
      }).select("question verdict");

      const questionStatusMap = {};
      studentSubmissions.forEach((sub) => {
        const qIdStr = sub.question.toString();
        if (sub.verdict === "Accepted") {
          questionStatusMap[qIdStr] = "Solved";
        } else if (questionStatusMap[qIdStr] !== "Solved") {
          questionStatusMap[qIdStr] = "Attempted";
        }
      });

      const studentSummaries = questions.map((q) => ({
        _id: q._id,
        title: q.title,
        difficulty: q.difficulty,
        supportedLanguages: q.supportedLanguages,
        sampleTestCasesCount: q.sampleTestCases?.length || 0,
        createdAt: q.createdAt,
        classroom: q.classroom,
        status: questionStatusMap[q._id.toString()] || "Not Attempted",
      }));

      return res.status(200).json({
        success: true,
        count: studentSummaries.length,
        questions: studentSummaries,
      });
    }

    // For Teacher or Admin
    if (
      !classroom.teacher.equals(req.user._id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view questions for this classroom",
      });
    }

    const questions = await Question.find({
      classroom: classroomId,
      isActive: true,
    })
      .select("-hiddenTestCases") // Do not return hidden test-case contents in summary list
      .sort({ createdAt: -1 });

    const questionSummaries = questions.map((q) => ({
      _id: q._id,
      title: q.title,
      difficulty: q.difficulty,
      supportedLanguages: q.supportedLanguages,
      sampleTestCasesCount: q.sampleTestCases.length,
      createdAt: q.createdAt,
      classroom: q.classroom,
    }));

    return res.status(200).json({
      success: true,
      count: questionSummaries.length,
      questions: questionSummaries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get question details by ID (role-based: teacher gets hidden tests, student gets safe DTO)
// @route   GET /api/questions/:questionId
// @access  Private (Teacher owning classroom OR Enrolled Student)
const getQuestionById = async (req, res, next) => {
  try {
    const { questionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question ID format",
      });
    }

    const question = await Question.findById(questionId).populate(
      "classroom",
      "name teacher"
    );

    if (!question || !question.isActive) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // If Student: verify enrollment and return student-safe DTO
    if (req.user.role === "student") {
      const isEnrolled = await ClassroomMembership.exists({
        classroom: question.classroom._id || question.classroom,
        student: req.user._id,
      });

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this question's classroom",
        });
      }

      return res.status(200).json({
        success: true,
        question: question.toStudentJSON(),
      });
    }

    // If Teacher: verify owning teacher
    const classroomTeacherId = question.classroom?.teacher;
    if (
      !classroomTeacherId ||
      (!classroomTeacherId.equals(req.user._id) && req.user.role !== "admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this question",
      });
    }

    return res.status(200).json({
      success: true,
      question,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update question
// @route   PATCH /api/questions/:questionId
// @access  Private (Teacher owning the classroom)
const updateQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const {
      title,
      description,
      inputFormat,
      outputFormat,
      constraints,
      difficulty,
      supportedLanguages,
      sampleTestCases,
      hiddenTestCases,
      classroom,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question ID format",
      });
    }

    // Prevent changing classroom association
    if (classroom) {
      return res.status(400).json({
        success: false,
        message: "A question's classroom association cannot be modified",
      });
    }

    const targetQuestion = await Question.findById(questionId).populate(
      "classroom",
      "teacher"
    );

    if (!targetQuestion || !targetQuestion.isActive) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Authorization check
    const classroomTeacherId = targetQuestion.classroom?.teacher;
    if (
      !classroomTeacherId ||
      (!classroomTeacherId.equals(req.user._id) && req.user.role !== "admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this question",
      });
    }

    // Field updates with validation
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Title cannot be empty",
        });
      }
      targetQuestion.title = title.trim();
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({
          success: false,
          message: "Description cannot be empty",
        });
      }
      targetQuestion.description = description.trim();
    }

    if (inputFormat !== undefined) {
      if (!inputFormat.trim()) {
        return res.status(400).json({
          success: false,
          message: "Input format cannot be empty",
        });
      }
      targetQuestion.inputFormat = inputFormat.trim();
    }

    if (outputFormat !== undefined) {
      if (!outputFormat.trim()) {
        return res.status(400).json({
          success: false,
          message: "Output format cannot be empty",
        });
      }
      targetQuestion.outputFormat = outputFormat.trim();
    }

    if (constraints !== undefined) {
      targetQuestion.constraints = constraints.trim();
    }

    if (difficulty !== undefined) {
      const validDifficulties = ["Easy", "Medium", "Hard"];
      if (!validDifficulties.includes(difficulty)) {
        return res.status(400).json({
          success: false,
          message: `Difficulty must be one of: ${validDifficulties.join(", ")}`,
        });
      }
      targetQuestion.difficulty = difficulty;
    }

    if (supportedLanguages !== undefined) {
      const validLanguages = ["cpp", "java", "python", "javascript"];
      if (
        !Array.isArray(supportedLanguages) ||
        supportedLanguages.length === 0 ||
        !supportedLanguages.every((l) => validLanguages.includes(l))
      ) {
        return res.status(400).json({
          success: false,
          message: `Supported languages must only contain valid options: ${validLanguages.join(", ")}`,
        });
      }
      targetQuestion.supportedLanguages = supportedLanguages;
    }

    if (sampleTestCases !== undefined) {
      if (
        !Array.isArray(sampleTestCases) ||
        sampleTestCases.length === 0 ||
        !sampleTestCases.every(
          (tc) =>
            tc &&
            typeof tc.expectedOutput === "string" &&
            tc.expectedOutput.trim().length > 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "At least one sample test case with expected output is required",
        });
      }
      targetQuestion.sampleTestCases = sampleTestCases.map((tc) => ({
        input: tc.input || "",
        expectedOutput: tc.expectedOutput.trim(),
      }));
    }

    if (hiddenTestCases !== undefined) {
      if (
        !Array.isArray(hiddenTestCases) ||
        hiddenTestCases.length === 0 ||
        !hiddenTestCases.every(
          (tc) =>
            tc &&
            typeof tc.expectedOutput === "string" &&
            tc.expectedOutput.trim().length > 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "At least one hidden test case with expected output is required",
        });
      }
      targetQuestion.hiddenTestCases = hiddenTestCases.map((tc) => ({
        input: tc.input || "",
        expectedOutput: tc.expectedOutput.trim(),
      }));
    }

    await targetQuestion.save();

    return res.status(200).json({
      success: true,
      message: "Question updated successfully",
      question: targetQuestion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete (archive) question
// @route   DELETE /api/questions/:questionId
// @access  Private (Teacher owning the classroom)
const deleteQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question ID format",
      });
    }

    const question = await Question.findById(questionId).populate(
      "classroom",
      "teacher"
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Verify owning teacher
    const classroomTeacherId = question.classroom?.teacher;
    if (
      !classroomTeacherId ||
      (!classroomTeacherId.equals(req.user._id) && req.user.role !== "admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this question",
      });
    }

    // Soft delete to protect future submission records
    question.isActive = false;
    await question.save();

    return res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuestion,
  getClassroomQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};
