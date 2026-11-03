const mongoose = require("mongoose");
const Classroom = require("../models/Classroom");
const ClassroomMembership = require("../models/ClassroomMembership");

// Clean character set for readable, unambiguous codes
const JOIN_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a unique 7-character uppercase alphanumeric join code with retry logic
 */
async function generateUniqueJoinCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = "";
    for (let i = 0; i < 7; i++) {
      const randomIndex = Math.floor(Math.random() * JOIN_CODE_CHARSET.length);
      code += JOIN_CODE_CHARSET[randomIndex];
    }

    const existing = await Classroom.findOne({ joinCode: code });
    if (!existing) {
      return code;
    }
  }
  throw new Error("Failed to generate unique joining code. Please try again.");
}

// @desc    Create a new classroom
// @route   POST /api/classrooms
// @access  Private (Approved Teachers only)
const createClassroom = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a classroom name",
      });
    }

    const joinCode = await generateUniqueJoinCode();

    const classroom = await Classroom.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      joinCode,
      teacher: req.user._id,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Classroom created successfully",
      classroom: {
        _id: classroom._id,
        name: classroom.name,
        description: classroom.description,
        joinCode: classroom.joinCode,
        isActive: classroom.isActive,
        createdAt: classroom.createdAt,
        studentCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get classrooms relevant to authenticated user
// @route   GET /api/classrooms/my-classrooms
// @access  Private (Teachers & Students)
const getMyClassrooms = async (req, res, next) => {
  try {
    if (req.user.role === "teacher") {
      // Find all classrooms created by this teacher
      const classrooms = await Classroom.find({
        teacher: req.user._id,
      }).sort({ createdAt: -1 });

      // Compute student count for each classroom
      const classroomList = await Promise.all(
        classrooms.map(async (c) => {
          const studentCount = await ClassroomMembership.countDocuments({
            classroom: c._id,
          });
          return {
            _id: c._id,
            name: c.name,
            description: c.description,
            joinCode: c.joinCode,
            isActive: c.isActive,
            createdAt: c.createdAt,
            studentCount,
          };
        })
      );

      return res.status(200).json({
        success: true,
        count: classroomList.length,
        classrooms: classroomList,
      });
    } else if (req.user.role === "student") {
      // Find all memberships for this student
      const memberships = await ClassroomMembership.find({
        student: req.user._id,
      })
        .populate({
          path: "classroom",
          populate: {
            path: "teacher",
            select: "name email",
          },
        })
        .sort({ joinedAt: -1 });

      const validMemberships = memberships.filter((m) => m.classroom != null);

      const classroomList = await Promise.all(
        validMemberships.map(async (m) => {
          const c = m.classroom;
          const studentCount = await ClassroomMembership.countDocuments({
            classroom: c._id,
          });
          return {
            _id: c._id,
            name: c.name,
            description: c.description,
            teacherName: c.teacher?.name || "Instructor",
            teacherEmail: c.teacher?.email || "",
            isActive: c.isActive,
            joinedAt: m.joinedAt,
            studentCount,
          };
        })
      );

      return res.status(200).json({
        success: true,
        count: classroomList.length,
        classrooms: classroomList,
      });
    } else {
      // Admin fallback: return all active classrooms
      const classrooms = await Classroom.find()
        .populate("teacher", "name email")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: classrooms.length,
        classrooms,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get single classroom details
// @route   GET /api/classrooms/:id
// @access  Private (Teacher of classroom or Enrolled student)
const getClassroomById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid classroom ID format",
      });
    }

    const classroom = await Classroom.findById(id).populate(
      "teacher",
      "name email"
    );

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: "Classroom not found",
      });
    }

    const isTeacher =
      classroom.teacher._id.equals(req.user._id) || req.user.role === "admin";

    if (isTeacher) {
      // Teacher view: include enrolled students
      const memberships = await ClassroomMembership.find({
        classroom: classroom._id,
      })
        .populate("student", "name email")
        .sort({ joinedAt: -1 });

      const students = memberships
        .filter((m) => m.student != null)
        .map((m) => ({
          _id: m.student._id,
          name: m.student.name,
          email: m.student.email,
          joinedAt: m.joinedAt,
        }));

      return res.status(200).json({
        success: true,
        classroom: {
          _id: classroom._id,
          name: classroom.name,
          description: classroom.description,
          joinCode: classroom.joinCode,
          isActive: classroom.isActive,
          createdAt: classroom.createdAt,
          teacherName: classroom.teacher.name,
          teacherEmail: classroom.teacher.email,
          studentCount: students.length,
          students,
        },
      });
    }

    // Student view: verify enrollment
    const membership = await ClassroomMembership.findOne({
      classroom: classroom._id,
      student: req.user._id,
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this classroom",
      });
    }

    const studentCount = await ClassroomMembership.countDocuments({
      classroom: classroom._id,
    });

    return res.status(200).json({
      success: true,
      classroom: {
        _id: classroom._id,
        name: classroom.name,
        description: classroom.description,
        isActive: classroom.isActive,
        createdAt: classroom.createdAt,
        teacherName: classroom.teacher.name,
        teacherEmail: classroom.teacher.email,
        joinedAt: membership.joinedAt,
        studentCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update classroom details
// @route   PATCH /api/classrooms/:id
// @access  Private (Teacher of classroom only)
const updateClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid classroom ID format",
      });
    }

    const classroom = await Classroom.findById(id);

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
        message: "You are not authorized to update this classroom",
      });
    }

    if (name !== undefined) classroom.name = name.trim();
    if (description !== undefined) classroom.description = description.trim();
    if (isActive !== undefined) classroom.isActive = Boolean(isActive);

    await classroom.save();

    return res.status(200).json({
      success: true,
      message: "Classroom updated successfully",
      classroom,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get enrolled students in classroom
// @route   GET /api/classrooms/:id/students
// @access  Private (Teacher of classroom only)
const getClassroomStudents = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid classroom ID format",
      });
    }

    const classroom = await Classroom.findById(id);

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
        message: "You are not authorized to view students of this classroom",
      });
    }

    const memberships = await ClassroomMembership.find({
      classroom: classroom._id,
    })
      .populate("student", "name email")
      .sort({ joinedAt: -1 });

    const students = memberships
      .filter((m) => m.student != null)
      .map((m) => ({
        _id: m.student._id,
        name: m.student.name,
        email: m.student.email,
        joinedAt: m.joinedAt,
      }));

    return res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive / Soft-delete classroom
// @route   DELETE /api/classrooms/:id
// @access  Private (Teacher of classroom only)
const deleteClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid classroom ID format",
      });
    }

    const classroom = await Classroom.findById(id);

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
        message: "You are not authorized to archive this classroom",
      });
    }

    classroom.isActive = false;
    await classroom.save();

    return res.status(200).json({
      success: true,
      message: "Classroom has been archived successfully",
      classroom,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join classroom using join code
// @route   POST /api/classrooms/join
// @access  Private (Authenticated Students only)
const joinClassroom = async (req, res, next) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode || !joinCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a classroom join code",
      });
    }

    const normalizedCode = joinCode.trim().toUpperCase();
    const classroom = await Classroom.findOne({ joinCode: normalizedCode }).populate(
      "teacher",
      "name email"
    );

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: "No classroom found with that code",
      });
    }

    if (!classroom.isActive) {
      return res.status(400).json({
        success: false,
        message: "This classroom is inactive or archived",
      });
    }

    // Check if student already enrolled
    const existingMembership = await ClassroomMembership.findOne({
      classroom: classroom._id,
      student: req.user._id,
    });

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this classroom",
      });
    }

    const membership = await ClassroomMembership.create({
      classroom: classroom._id,
      student: req.user._id,
      joinedAt: new Date(),
    });

    const studentCount = await ClassroomMembership.countDocuments({
      classroom: classroom._id,
    });

    return res.status(201).json({
      success: true,
      message: `Enrolled in ${classroom.name} successfully`,
      classroom: {
        _id: classroom._id,
        name: classroom.name,
        description: classroom.description,
        teacherName: classroom.teacher?.name || "Instructor",
        joinedAt: membership.joinedAt,
        studentCount,
      },
    });
  } catch (error) {
    // Handle unique constraint error defensively
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this classroom",
      });
    }
    next(error);
  }
};

module.exports = {
  createClassroom,
  getMyClassrooms,
  getClassroomById,
  updateClassroom,
  getClassroomStudents,
  deleteClassroom,
  joinClassroom,
};
