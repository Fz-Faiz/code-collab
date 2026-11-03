import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Preserved Multiplayer Pages
import HomePage from "./pages/HomePage";
import EditorPage from "./pages/EditorPage";

// Phase 2 Authentication & Dashboard Pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeacherApprovalPage from "./pages/admin/TeacherApprovalPage";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";

// Phase 3 Classroom Pages
import TeacherClassroomDetail from "./pages/teacher/TeacherClassroomDetail";
import StudentClassroomDetail from "./pages/student/StudentClassroomDetail";

// Phase 4A Teacher Question Pages
import QuestionFormPage from "./pages/teacher/QuestionFormPage";

// Phase 4B Student Problem Solving Pages
import StudentQuestionPage from "./pages/student/StudentQuestionPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Module A: Preserved Public Multiplayer Coding Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/editor/:roomId" element={<EditorPage />} />

        {/* Phase 2: Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Phase 2: Role-Protected Admin Routes */}
        <Route
          path="/app/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/admin/teachers"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <TeacherApprovalPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 2 & 3: Role-Protected Teacher Routes */}
        <Route
          path="/app/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/teacher/classroom/:id"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <TeacherClassroomDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/teacher/classroom/:classroomId/question/new"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <QuestionFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/teacher/classroom/:classroomId/question/:questionId/edit"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <QuestionFormPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 2 & 3: Role-Protected Student Routes */}
        <Route
          path="/app/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/student/classroom/:id"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentClassroomDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/student/classroom/:classroomId/question/:questionId"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentQuestionPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
