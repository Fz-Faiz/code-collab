import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LogOut, Code, UserCheck, Shield, BookOpen, GraduationCap } from "lucide-react";
import toast from "react-hot-toast";

const DashboardNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
            <Shield size={12} /> Admin
          </span>
        );
      case "teacher":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <BookOpen size={12} /> Teacher
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
            <GraduationCap size={12} /> Student
          </span>
        );
    }
  };

  return (
    <nav className="h-16 bg-[#161B22] border-b border-[#30363D] px-6 flex items-center justify-between sticky top-0 z-40 text-white">
      {/* Brand & Links */}
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/code-collab.png"
            alt="Code Collab"
            className="w-8 h-8 object-contain"
          />
          <span className="font-bold text-lg tracking-wide hidden sm:inline">
            Code Collab
          </span>
        </Link>

        <div className="flex items-center gap-4 text-sm font-medium">
          {user?.role === "admin" && (
            <>
              <Link
                to="/app/admin/dashboard"
                className="text-gray-300 hover:text-white transition"
              >
                Dashboard
              </Link>
              <Link
                to="/app/admin/teachers"
                className="text-gray-300 hover:text-white transition flex items-center gap-1"
              >
                <UserCheck size={16} /> Teacher Approvals
              </Link>
            </>
          )}

          {user?.role === "teacher" && (
            <Link
              to="/app/teacher/dashboard"
              className="text-gray-300 hover:text-white transition"
            >
              Classroom Dashboard
            </Link>
          )}

          {user?.role === "student" && (
            <Link
              to="/app/student/dashboard"
              className="text-gray-300 hover:text-white transition"
            >
              Student Portal
            </Link>
          )}

          <Link
            to="/"
            className="text-gray-400 hover:text-green-400 transition flex items-center gap-1"
          >
            <Code size={16} /> Multiplayer Rooms
          </Link>
        </div>
      </div>

      {/* User profile & Logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          {getRoleBadge(user?.role)}
        </div>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="p-2 rounded-lg bg-[#21262D] hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition"
        >
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
};

export default DashboardNavbar;
