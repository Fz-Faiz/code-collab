const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const initEditorSocket = require("./sockets/editorSocket");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const classroomRoutes = require("./routes/classroomRoutes");
const questionRoutes = require("./routes/questionRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const tutorRoutes = require("./routes/tutorRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const path = require("path");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);

// Parse FRONTEND_URL supporting comma-separated origins and stripping trailing slashes
const rawFrontendOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set(["http://localhost:5173", ...rawFrontendOrigins])
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// API Routes & Health endpoints (supports Render default /health and /api/health)
app.use("/", healthRoutes);
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/tutor", tutorRoutes);

// Initialize Socket.io Editor handlers (Module A - Multiplayer)
initEditorSocket(io);

// Centralized Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Global unhandled error handlers to avoid unexpected server crashes
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

// Async server startup: guarantee database connects before listening
const startServer = async () => {
  try {
    await connectDB();
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "FATAL: Server startup aborted due to MongoDB connection failure in production."
      );
      process.exit(1);
    }
  }

  server.listen(PORT, () => {
    console.log(`Server started at Port: ${PORT}`);
  });
};

startServer();

module.exports = { app, server, io, startServer };
