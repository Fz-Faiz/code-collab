const mongoose = require("mongoose");

const aiUsageSchema = new mongoose.Schema(
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
    hintLevel: {
      type: Number,
      required: [true, "Hint number is required"],
      min: 1, // Unlimited progressive hints (1, 2, ... N)
      index: true,
    },
    progressCategory: {
      type: String,
      required: [true, "Progress category is required"],
      enum: [
        "NO_CODE",
        "INITIAL_IMPLEMENTATION",
        "PARTIAL_IMPLEMENTATION",
        "LOGIC_ISSUE",
        "IMPLEMENTATION_BUG",
        "NEARLY_SOLVED",
        "SOLVED",
      ],
    },
    hintTitle: {
      type: String,
      default: "AI Hint",
      maxlength: 200,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only record creation timestamp
  }
);

// Compound indexes for fast classroom and student analytics aggregation
aiUsageSchema.index({ classroom: 1, question: 1, createdAt: -1 });
aiUsageSchema.index({ student: 1, question: 1 });
aiUsageSchema.index({ classroom: 1, student: 1 });

const AIUsage = mongoose.model("AIUsage", aiUsageSchema);

module.exports = AIUsage;
