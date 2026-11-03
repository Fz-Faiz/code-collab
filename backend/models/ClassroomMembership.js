const mongoose = require("mongoose");

const classroomMembershipSchema = new mongoose.Schema(
  {
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: [true, "Classroom reference is required"],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring a student can only join a classroom once
classroomMembershipSchema.index({ classroom: 1, student: 1 }, { unique: true });

const ClassroomMembership = mongoose.model(
  "ClassroomMembership",
  classroomMembershipSchema
);

module.exports = ClassroomMembership;
