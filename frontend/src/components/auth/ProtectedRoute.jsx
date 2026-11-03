import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Loader2, AlertCircle, Clock } from "lucide-react";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1117] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          <p className="text-gray-400 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Teacher status check
  if (user.role === "teacher" && user.status !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1117] text-white p-4">
        <div className="max-w-md w-full bg-[#161B22] border border-[#30363D] rounded-xl p-8 text-center space-y-4 shadow-xl">
          {user.status === "pending" ? (
            <Clock className="w-16 h-16 text-yellow-500 mx-auto" />
          ) : (
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          )}

          <h2 className="text-2xl font-bold">
            {user.status === "pending"
              ? "Account Pending Approval"
              : "Registration Rejected"}
          </h2>

          <p className="text-gray-400 text-sm">
            {user.status === "pending"
              ? "Your teacher account has been created and is currently waiting for administrator approval. You will receive access once an administrator approves your account."
              : "Your teacher account registration was reviewed and rejected by an administrator."}
          </p>

          <div className="pt-4 flex gap-3 justify-center">
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
            >
              Sign Out
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-medium rounded-lg text-sm transition"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Role validation
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "admin") {
      return <Navigate to="/app/admin/dashboard" replace />;
    } else if (user.role === "teacher") {
      return <Navigate to="/app/teacher/dashboard" replace />;
    } else {
      return <Navigate to="/app/student/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
