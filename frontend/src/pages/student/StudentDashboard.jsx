import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardNavbar from "../../components/common/DashboardNavbar";
import { apiRequest } from "../../services/api";
import {
  GraduationCap,
  Plus,
  Users,
  Calendar,
  ArrowRight,
  Loader2,
  School,
  X,
  Code2,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/classrooms/my-classrooms");
      if (data.success && Array.isArray(data.classrooms)) {
        setClassrooms(data.classrooms);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load classrooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleJoinClassroom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error("Please enter a classroom join code");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest("/api/classrooms/join", {
        method: "POST",
        body: JSON.stringify({ joinCode }),
      });

      toast.success(data.message || "Enrolled in classroom successfully!");
      setJoinCode("");
      setJoinModalOpen(false);
      fetchClassrooms();
    } catch (err) {
      toast.error(err.message || "Failed to join classroom");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161B22] border border-[#30363D] p-6 rounded-2xl">
          <div>
            <div className="flex items-center gap-2 text-green-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <GraduationCap size={16} /> Student Learning Portal
            </div>
            <h1 className="text-3xl font-bold">Welcome, {user?.name}!</h1>
            <p className="text-gray-400 text-sm mt-1">
              Access your enrolled classrooms, solve coding problems, and receive AI hints.
            </p>
          </div>

          <button
            onClick={() => setJoinModalOpen(true)}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black px-5 py-2.5 rounded-xl font-semibold transition text-sm shadow-md cursor-pointer shrink-0"
          >
            <Plus size={18} /> Join Classroom
          </button>
        </div>

        {/* My Classrooms Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Enrolled Classrooms ({classrooms.length})</h2>
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-2" />
              <p className="text-sm">Loading your classrooms...</p>
            </div>
          ) : classrooms.length === 0 ? (
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-12 text-center text-gray-400 space-y-4">
              <School className="w-12 h-12 mx-auto text-gray-600" />
              <div>
                <h3 className="text-lg font-bold text-white">Not enrolled in any classrooms</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Ask your instructor for their unique 7-character joining code to access problem sets.
                </p>
              </div>
              <button
                onClick={() => setJoinModalOpen(true)}
                className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-xl text-sm transition cursor-pointer"
              >
                Enter Join Code
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {classrooms.map((c) => (
                <div
                  key={c._id}
                  className="bg-[#161B22] border border-[#30363D] hover:border-gray-500 rounded-2xl p-6 flex flex-col justify-between space-y-4 transition shadow-md"
                >
                  <div>
                    <h3 className="text-lg font-bold text-white line-clamp-1">
                      {c.name}
                    </h3>
                    <p className="text-xs text-green-400 mt-1 font-medium">
                      Instructor: {c.teacherName}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 min-h-[32px]">
                      {c.description || "No description provided."}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="pt-2 border-t border-[#30363D] flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-blue-400" />
                      {c.studentCount} peer{c.studentCount === 1 ? "" : "s"}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      Joined {new Date(c.joinedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <Link
                    to={`/app/student/classroom/${c._id}`}
                    className="w-full bg-[#21262D] hover:bg-green-500 hover:text-black text-gray-200 py-2.5 rounded-xl text-center text-sm font-semibold transition flex items-center justify-center gap-2"
                  >
                    Open Classroom <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* JOIN CLASSROOM MODAL */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setJoinModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold">Join a Classroom</h3>
              <p className="text-xs text-gray-400 mt-1">
                Enter the unique code provided by your instructor.
              </p>
            </div>

            <form onSubmit={handleJoinClassroom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                  Classroom Join Code *
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 7X8K2P4"
                  maxLength={10}
                  required
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-3 font-mono text-center text-lg tracking-widest uppercase outline-none focus:border-green-500 text-green-400"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(false)}
                  className="w-1/2 py-2.5 bg-[#21262D] hover:bg-[#30363D] text-gray-300 font-medium rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-black font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Joining...
                    </>
                  ) : (
                    "Join Classroom"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
