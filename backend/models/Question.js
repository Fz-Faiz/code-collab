const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      default: "",
    },
    expectedOutput: {
      type: String,
      required: [true, "Expected output is required"],
    },
  },
  { _id: true }
);

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Question title is required"],
      trim: true,
      maxlength: [150, "Question title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Problem description is required"],
    },
    inputFormat: {
      type: String,
      required: [true, "Input format is required"],
    },
    outputFormat: {
      type: String,
      required: [true, "Output format is required"],
    },
    constraints: {
      type: String,
      default: "",
    },
    difficulty: {
      type: String,
      enum: {
        values: ["Easy", "Medium", "Hard"],
        message: "{VALUE} is not a valid difficulty level",
      },
      default: "Medium",
      index: true,
    },
    supportedLanguages: {
      type: [
        {
          type: String,
          enum: {
            values: ["cpp", "java", "python", "javascript"],
            message: "{VALUE} is not a supported language",
          },
        },
      ],
      default: ["cpp", "java", "python", "javascript"],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: "At least one supported programming language must be selected",
      },
    },
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: [true, "Classroom reference is required"],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator reference is required"],
      index: true,
    },
    sampleTestCases: {
      type: [testCaseSchema],
      required: [true, "At least one sample test case is required"],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: "At least one sample test case is required",
      },
    },
    hiddenTestCases: {
      type: [testCaseSchema],
      required: [true, "At least one hidden test case is required"],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: "At least one hidden test case is required",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to serialize question safely for student responses (strips hidden test cases)
questionSchema.methods.toStudentJSON = function () {
  const obj = this.toObject();
  delete obj.hiddenTestCases;
  delete obj.__v;
  return obj;
};

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;
