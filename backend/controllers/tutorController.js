const mongoose = require("mongoose");
const Question = require("../models/Question");
const Classroom = require("../models/Classroom");
const ClassroomMembership = require("../models/ClassroomMembership");
const Submission = require("../models/Submission");
const AIUsage = require("../models/AIUsage");
const aiTutorService = require("../services/aiTutorService");

// @desc    Request progressive AI hint for a problem
// @route   POST /api/tutor/hint
// @access  Private (Authenticated student enrolled in classroom)
const getHint = async (req, res, next) => {
  try {
    const {
      questionId,
      code,
      language,
      requestedHintLevel,
      requestedLevel,
      studentQuery,
      previousHints = [],
    } = req.body;

    const hintLevel = Number(requestedHintLevel || requestedLevel || 1);

    // Security check: Student role only
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can request AI tutoring hints",
      });
    }

    if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid question ID is required",
      });
    }

    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      return res.status(404).json({
        success: false,
        message: "Question not found or is no longer active",
      });
    }

    // Verify student is enrolled in the classroom
    const isEnrolled = await ClassroomMembership.exists({
      classroom: question.classroom,
      student: req.user._id,
    });

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this classroom to access the AI Coding Tutor",
      });
    }

    // Validate language
    if (!language || !question.supportedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: `Language '${language}' is not supported for this question. Supported: ${question.supportedLanguages.join(", ")}`,
      });
    }

    // Determine progressive conversation hint counter (Unlimited hints: 1, 2, ... N)
    const previousHintCount = await AIUsage.countDocuments({
      student: req.user._id,
      question: question._id,
    });
    const currentHintNumber = previousHintCount + 1;
    const effectiveHintNumber = Math.max(
      1,
      Number(requestedHintLevel || requestedLevel || currentHintNumber)
    );

    // Payload size guards
    const safeCode = typeof code === "string" ? code : "";
    if (safeCode.length > 40000) {
      return res.status(400).json({
        success: false,
        message: "Source code exceeds maximum allowable character limit (40,000 chars)",
      });
    }

    // Validate previous hints history (capped at 10 items)
    const safePreviousHints = Array.isArray(previousHints)
      ? previousHints.slice(-10).map((h) => ({
          hintLevel: Number(h.hintLevel) || 1,
          hintTitle: String(h.hintTitle || "").slice(0, 200),
          hint: String(h.hint || h.hintText || "").slice(0, 5000),
        }))
      : [];

    // ========================================================
    // TRUSTED DATA BOUNDARY: CONSTRUCT TEST SUMMARY SERVER-SIDE
    // Frontend-supplied test counts / progress categories are ignored
    // ========================================================
    const submissions = await Submission.find({
      student: req.user._id,
      question: question._id,
    })
      .sort({ createdAt: -1 })
      .select("verdict totalTestCases passedTestCases failedTestCases createdAt")
      .lean();

    const totalQuestionsTests =
      (question.sampleTestCases?.length || 0) + (question.hiddenTestCases?.length || 0);

    let trustedSummary = {
      passed: 0,
      failed: 0,
      total: totalQuestionsTests,
      verdict: "Not Attempted",
    };

    if (submissions.length > 0) {
      // Check if student already achieved an Accepted submission
      const acceptedSub = submissions.find((s) => s.verdict === "Accepted");
      if (acceptedSub) {
        trustedSummary = {
          passed: acceptedSub.totalTestCases || totalQuestionsTests,
          failed: 0,
          total: acceptedSub.totalTestCases || totalQuestionsTests,
          verdict: "Accepted",
        };
      } else {
        // Use most recent submission metrics
        const latest = submissions[0];
        const passedCount = latest.passedTestCases || 0;
        const totalCount = latest.totalTestCases || totalQuestionsTests;
        const failedCount =
          typeof latest.failedTestCases === "number" && latest.failedTestCases > 0
            ? latest.failedTestCases
            : Math.max(0, totalCount - passedCount);
        trustedSummary = {
          passed: passedCount,
          failed: failedCount,
          total: totalCount,
          verdict: latest.verdict,
        };
      }
    }

    // Call FastAPI microservice (problem object excludes hiddenTestCases)
    const problemContext = {
      title: question.title,
      description: question.description,
      inputFormat: question.inputFormat,
      outputFormat: question.outputFormat,
      constraints: question.constraints || "",
    };

    const hintData = await aiTutorService.requestHint({
      problem: problemContext,
      code: safeCode,
      language,
      testResults: trustedSummary,
      previousHints: safePreviousHints,
      requestedHintLevel: effectiveHintNumber,
      hintNumber: effectiveHintNumber,
      studentQuery: typeof studentQuery === "string" ? studentQuery.slice(0, 2000) : "",
    });

    // Record minimal analytics metadata (No private conversation text or full answers)
    try {
      await AIUsage.create({
        student: req.user._id,
        classroom: question.classroom,
        question: question._id,
        hintLevel: hintData.hintLevel || effectiveHintNumber,
        progressCategory: hintData.progressCategory || "PARTIAL_IMPLEMENTATION",
        hintTitle: hintData.hintTitle || `Hint #${effectiveHintNumber}`,
      });
    } catch (saveErr) {
      console.error("Failed to record AI usage metadata:", saveErr.message);
      // Non-blocking: continue even if analytics logging fails
    }

    const formattedHint = {
      ...hintData,
      hintText: hintData.hintText || hintData.hint,
      hint: hintData.hint || hintData.hintText,
      hintLevel: hintData.hintLevel || effectiveHintNumber,
      hintNumber: hintData.hintNumber || hintData.hintLevel || effectiveHintNumber,
      solved: Boolean(hintData.solved),
      identifiedBugs: hintData.identifiedBugs || [],
      fixedBugs: hintData.fixedBugs || [],
      remainingBugs: hintData.remainingBugs || [],
    };

    return res.status(200).json({
      success: true,
      hint: formattedHint,
      progressCategory: hintData.progressCategory,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregate AI Tutor analytics for a classroom
// @route   GET /api/classrooms/:classroomId/analytics/ai
// @access  Private (Approved teacher owning the classroom or Admin)
const getClassroomAIAnalytics = async (req, res, next) => {
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

    // Security: Only owning teacher or admin
    if (
      !classroom.teacher.equals(req.user._id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view analytics for this classroom",
      });
    }

    // Fetch all AIUsage records for this classroom
    const usageRecords = await AIUsage.find({ classroom: classroomId }).lean();
    const totalHintsRequested = usageRecords.length;

    // Unique students who used hints
    const studentIdStrings = [...new Set(usageRecords.map((r) => r.student.toString()))];
    const totalStudentsHelped = studentIdStrings.length;

    const avgHintsPerStudent =
      totalStudentsHelped > 0
        ? Number((totalHintsRequested / totalStudentsHelped).toFixed(1))
        : 0;

    // Hint level distribution (Levels 1 to 4)
    const hintLevelDistribution = {
      level1: 0,
      level2: 0,
      level3: 0,
      level4: 0,
    };
    usageRecords.forEach((r) => {
      const lvlKey = `level${r.hintLevel}`;
      if (hintLevelDistribution[lvlKey] !== undefined) {
        hintLevelDistribution[lvlKey]++;
      }
    });

    // Question breakdown with question titles
    const questions = await Question.find({
      classroom: classroomId,
      isActive: true,
    }).select("title difficulty").lean();

    const questionMap = {};
    questions.forEach((q) => {
      questionMap[q._id.toString()] = {
        questionId: q._id,
        title: q.title,
        difficulty: q.difficulty,
        hintRequests: 0,
        uniqueStudents: new Set(),
      };
    });

    usageRecords.forEach((r) => {
      const qId = r.question.toString();
      if (questionMap[qId]) {
        questionMap[qId].hintRequests++;
        questionMap[qId].uniqueStudents.add(r.student.toString());
      }
    });

    const questionBreakdown = Object.values(questionMap).map((q) => ({
      questionId: q.questionId,
      title: q.title,
      difficulty: q.difficulty,
      hintRequests: q.hintRequests,
      uniqueStudentsCount: q.uniqueStudents.size,
    })).sort((a, b) => b.hintRequests - a.hintRequests);

    // Number of students who solved a question after using hints
    // Fetch all Accepted submissions for this classroom from students who used hints
    const acceptedSubmissions = await Submission.find({
      classroom: classroomId,
      student: { $in: studentIdStrings },
      verdict: "Accepted",
    }).select("student question").lean();

    // Map of "studentId_questionId" that have an accepted submission
    const solvedPairs = new Set(
      acceptedSubmissions.map((s) => `${s.student.toString()}_${s.question.toString()}`)
    );

    // Track student_question pairs that requested hints
    const hintPairs = new Map(); // "studentId_questionId" -> count of hints
    usageRecords.forEach((r) => {
      const pairKey = `${r.student.toString()}_${r.question.toString()}`;
      hintPairs.set(pairKey, (hintPairs.get(pairKey) || 0) + 1);
    });

    let solvedAfterHintsCount = 0;
    let totalHintsOnSolvedQuestions = 0;

    for (const [pairKey, hintCount] of hintPairs.entries()) {
      if (solvedPairs.has(pairKey)) {
        solvedAfterHintsCount++;
        totalHintsOnSolvedQuestions += hintCount;
      }
    }

    const avgHintsPerSolvedQuestion =
      solvedAfterHintsCount > 0
        ? Number((totalHintsOnSolvedQuestions / solvedAfterHintsCount).toFixed(1))
        : 0;

    // Format question breakdown with all required fields
    const formattedBreakdown = questionBreakdown.map((q) => {
      // Find how many unique students solved this question after using hints
      const qIdStr = q.questionId.toString();
      const solvedForThisQ = Array.from(hintPairs.keys())
        .filter((k) => k.endsWith(`_${qIdStr}`) && solvedPairs.has(k)).length;

      return {
        questionId: q.questionId,
        title: q.title,
        difficulty: q.difficulty,
        hintRequests: q.hintRequests,
        hintsRequested: q.hintRequests,
        uniqueStudentsCount: q.uniqueStudentsCount,
        uniqueStudents: q.uniqueStudentsCount,
        solvedAfterHint: solvedForThisQ,
      };
    });

    return res.status(200).json({
      success: true,
      analytics: {
        classroomId,
        classroomName: classroom.name,
        totalHintsRequested,
        totalStudentsHelped,
        uniqueStudentsHelped: totalStudentsHelped,
        avgHintsPerStudent,
        solvedAfterHintsCount,
        solvedAfterHintCount: solvedAfterHintsCount,
        avgHintsPerSolvedQuestion,
        hintLevelDistribution,
        levelDistribution: hintLevelDistribution,
        questionBreakdown: formattedBreakdown,
        privacyNotice: "Metrics are aggregated for pedagogical insights. Private conversations and student code transcripts are never collected or stored.",
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed per-student classroom analytics & question-level progress
// @route   GET /api/classrooms/:classroomId/analytics/students
// @access  Private (Approved teacher owning classroom or Admin)
const getClassroomStudentsAnalytics = async (req, res, next) => {
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

    // Security: Only owning teacher or admin
    if (!classroom.teacher.equals(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view student analytics for this classroom",
      });
    }

    // 1. Fetch all active questions in this classroom
    const questions = await Question.find({
      classroom: classroomId,
      isActive: true,
    })
      .select("title difficulty createdAt")
      .sort({ createdAt: 1 })
      .lean();

    const assignedQuestionsCount = questions.length;

    // 2. Fetch all enrolled students in this classroom
    const memberships = await ClassroomMembership.find({
      classroom: classroomId,
    })
      .populate("student", "name email")
      .lean();

    const enrolledStudents = memberships
      .filter((m) => m.student)
      .map((m) => ({
        studentId: m.student._id.toString(),
        name: m.student.name,
        email: m.student.email,
        joinedAt: m.createdAt,
      }));

    const studentIds = enrolledStudents.map((s) => s.studentId);

    // 3. Fetch all submissions for this classroom from enrolled students
    const allSubmissions = await Submission.find({
      classroom: classroomId,
      student: { $in: studentIds },
    })
      .select("student question verdict createdAt")
      .sort({ createdAt: 1 }) // Chronological order
      .lean();

    // 4. Fetch all AIUsage hint records for this classroom from enrolled students
    const allHints = await AIUsage.find({
      classroom: classroomId,
      student: { $in: studentIds },
    })
      .select("student question hintLevel progressCategory createdAt")
      .sort({ createdAt: 1 })
      .lean();

    // Index submissions by `${studentId}_${questionId}`
    const submissionsByStudentQ = new Map();
    for (const sub of allSubmissions) {
      const key = `${sub.student.toString()}_${sub.question.toString()}`;
      if (!submissionsByStudentQ.has(key)) {
        submissionsByStudentQ.set(key, []);
      }
      submissionsByStudentQ.get(key).push(sub);
    }

    // Index hints by `${studentId}_${questionId}`
    const hintsByStudentQ = new Map();
    for (const h of allHints) {
      const key = `${h.student.toString()}_${h.question.toString()}`;
      if (!hintsByStudentQ.has(key)) {
        hintsByStudentQ.set(key, []);
      }
      hintsByStudentQ.get(key).push(h);
    }

    // 5. Compute metrics for each student
    const studentAnalytics = enrolledStudents.map((stud) => {
      let attemptedQuestionsCount = 0;
      let solvedQuestionsCount = 0;
      let totalStudentHints = 0;
      let totalHintsBeforeSolving = 0;
      let solvedWithoutAI = 0;
      let solvedWithAI = 0;

      const questionBreakdowns = questions.map((q) => {
        const qIdStr = q._id.toString();
        const key = `${stud.studentId}_${qIdStr}`;
        const subs = submissionsByStudentQ.get(key) || [];
        const hints = hintsByStudentQ.get(key) || [];

        const attempts = subs.length;
        const hintsUsed = hints.length;
        totalStudentHints += hintsUsed;

        // Find first Accepted submission
        const firstAccepted = subs.find((s) => s.verdict === "Accepted");
        const isSolved = !!firstAccepted;

        let hintsBeforeSolved = 0;
        if (isSolved) {
          // Count hint requests created BEFORE or AT the time of the first Accepted submission
          const acceptedTime = new Date(firstAccepted.createdAt).getTime();
          hintsBeforeSolved = hints.filter(
            (h) => new Date(h.createdAt).getTime() <= acceptedTime
          ).length;

          totalHintsBeforeSolving += hintsBeforeSolved;
          solvedQuestionsCount++;

          if (hintsBeforeSolved === 0) {
            solvedWithoutAI++;
          } else {
            solvedWithAI++;
          }
        }

        const isAttempted = attempts > 0 || hintsUsed > 0;
        if (isAttempted) {
          attemptedQuestionsCount++;
        }

        let status = "Not Attempted";
        if (isSolved) {
          status = "Solved";
        } else if (isAttempted) {
          status = "Attempted";
        }

        const finalVerdict =
          subs.length > 0
            ? isSolved
              ? "Accepted"
              : subs[subs.length - 1].verdict
            : "Not Attempted";

        return {
          questionId: q._id,
          title: q.title,
          difficulty: q.difficulty,
          status,
          attempts,
          hintsUsed,
          totalHints: hintsUsed,
          hintsBeforeSolved,
          finalVerdict,
        };
      });

      const unsolvedQuestionsCount = Math.max(
        0,
        assignedQuestionsCount - solvedQuestionsCount
      );

      const avgHintsPerSolvedQuestion =
        solvedQuestionsCount > 0
          ? Number((totalHintsBeforeSolving / solvedQuestionsCount).toFixed(1))
          : 0;

      return {
        studentId: stud.studentId,
        name: stud.name,
        email: stud.email,
        assignedQuestions: assignedQuestionsCount,
        attemptedQuestions: attemptedQuestionsCount,
        solvedQuestions: solvedQuestionsCount,
        unsolvedQuestions: unsolvedQuestionsCount,
        totalHints: totalStudentHints,
        totalHintsBeforeSolving,
        avgHintsPerSolvedQuestion,
        solvedWithoutAI,
        solvedWithAI,
        questions: questionBreakdowns,
      };
    });

    return res.status(200).json({
      success: true,
      classroomId,
      classroom: {
        id: classroom._id.toString(),
        name: classroom.name,
      },
      classroomName: classroom.name,
      assignedQuestionsCount,
      totalEnrolledStudents: enrolledStudents.length,
      students: studentAnalytics,
      privacyNotice:
        "Student progress and hint frequencies are aggregated for educational evaluation. Individual code submissions and private conversations remain protected.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHint,
  getClassroomAIAnalytics,
  getClassroomStudentsAnalytics,
};
