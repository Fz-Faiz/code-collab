import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardNavbar from "../../components/common/DashboardNavbar";
import { apiRequest } from "../../services/api";
import {
  ShieldCheck,
  UserCheck,
  Users,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      try {
        const data = await apiRequest("/api/admin/teachers");
        if (data.success && Array.isArray(data.teachers)) {
          const total = data.teachers.length;
          const pending = data.teachers.filter((t) => t.status === "pending").length;
          const approved = data.teachers.filter((t) => t.status === "approved").length;
          const rejected = data.teachers.filter((t) => t.status === "rejected").length;
          setStats({ total, pending, approved, rejected });
        }
      } catch (err) {
        console.error("Failed to load teacher stats:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
        {/* Header Greeting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161B22] border border-[#30363D] p-6 rounded-2xl">
          <div>
            <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck size={16} /> Administrator Workspace
            </div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.name}</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage platform faculty, review registration requests, and oversee platform security.
            </p>
          </div>

          <Link
            to="/app/admin/teachers"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium transition text-sm shadow-md"
          >
            Review Teacher Requests <ArrowRight size={16} />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#161B22] border border-[#30363D] p-5 rounded-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase">
              <span>Pending Approvals</span>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-yellow-400 mt-2">
              {loading ? <Loader2 size={24} className="animate-spin" /> : stats.pending}
            </p>
            <p className="text-xs text-gray-400 mt-1">Awaiting your review</p>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] p-5 rounded-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase">
              <span>Approved Faculty</span>
              <UserCheck className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-400 mt-2">
              {loading ? <Loader2 size={24} className="animate-spin" /> : stats.approved}
            </p>
            <p className="text-xs text-gray-400 mt-1">Active instructors</p>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] p-5 rounded-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase">
              <span>Total Teachers</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-blue-400 mt-2">
              {loading ? <Loader2 size={24} className="animate-spin" /> : stats.total}
            </p>
            <p className="text-xs text-gray-400 mt-1">All registrations</p>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] p-5 rounded-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase">
              <span>Rejected</span>
              <Clock className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-400 mt-2">
              {loading ? <Loader2 size={24} className="animate-spin" /> : stats.rejected}
            </p>
            <p className="text-xs text-gray-400 mt-1">Declined applications</p>
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold">Teacher Authorization Control</h3>
            <p className="text-sm text-gray-400">
              Only verified faculty members receive permission to create classrooms, author Codeforces-style challenges, and review student progress.
            </p>
            <Link
              to="/app/admin/teachers"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-semibold text-sm transition"
            >
              Open Teacher Approval Queue <ArrowRight size={14} />
            </Link>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold">Public Multiplayer Code Rooms</h3>
            <p className="text-sm text-gray-400">
              The public collaborative editor remains open for live peer coding, interview preparation, and real-time execution via OneCompiler.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 font-semibold text-sm transition"
            >
              Launch Public Coding Room <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
