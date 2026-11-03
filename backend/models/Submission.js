const mongoose = require("mongoose");

const testResultSchema = new mongoose.Schema(
  {
    testIndex: {
      type: Number,
      required: true,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    status: {
      type: String,
      enum: ["Passed", "Wrong Answer", "Compilation Error", "Runtime Error"],
      default: "Passed",
    },
    executionTime: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
      index: true,
    },
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: [true, "Classroom reference is required"],
      index: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: [true, "Question reference is required"],
      index: true,
    },
    code: {
      type: String,
      required: [true, "Submitted code is required"],
    },
    language: {
      type: String,
      required: [true, "Programming language is required"],
      enum: {
        values: ["cpp", "java", "python", "javascript"],
        message: "{VALUE} is not a supported language",
      },
    },
    verdict: {
      type: String,
      required: [true, "Verdict is required"],
      enum: {
        values: ["Accepted", "Wrong Answer", "Compilation Error", "Runtime Error"],
        message: "{VALUE} is not a valid submission verdict",
      },
      index: true,
    },
    totalTestCases: {
      type: Number,
      required: true,
      default: 0,
    },
    passedTestCases: {
      type: Number,
      required: true,
      default: 0,
    },
    failedTestCases: {
      type: Number,
      required: true,
      default: 0,
    },
    // Safe per-test execution flags (never stores hidden test inputs or expected outputs)
    testResults: [testResultSchema],
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
submissionSchema.index({ student: 1, question: 1, createdAt: -1 });
submissionSchema.index({ classroom: 1, question: 1 });
submissionSchema.index({ question: 1, createdAt: -1 });

// Method to serialize safe submission summary for student frontend
submissionSchema.methods.toSafeJSON = function () {
  return {
    _id: this._id,
    student: this.student,
    classroom: this.classroom,
    question: this.question,
    code: this.code,
    language: this.language,
    verdict: this.verdict,
    totalTestCases: this.totalTestCases,
    passedTestCases: this.passedTestCases,
    failedTestCases: this.failedTestCases,
    testResults: this.testResults,
    errorMessage: this.errorMessage,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Submission = mongoose.model("Submission", submissionSchema);

module.exports = Submission;
