import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardNavbar from "../../components/common/DashboardNavbar";
import { apiRequest } from "../../services/api";
import {
  BookOpen,
  Plus,
  Users,
  Copy,
  Check,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
  School,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");
  const [newlyCreatedClassroom, setNewlyCreatedClassroom] = useState(null);

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

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a classroom name");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest("/api/classrooms", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });

      toast.success("Classroom created successfully!");
      setNewlyCreatedClassroom(data.classroom);
      setName("");
      setDescription("");
      fetchClassrooms();
    } catch (err) {
      toast.error(err.message || "Failed to create classroom");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Copied code: ${code}`);
      setTimeout(() => setCopiedCode(""), 2500);
    } catch (err) {
      toast.error("Failed to copy code to clipboard");
    }
  };

  const totalStudents = classrooms.reduce(
    (acc, curr) => acc + (curr.studentCount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
        {/* Header & Quick Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161B22] border border-[#30363D] p-6 rounded-2xl">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <BookOpen size={16} /> Faculty Classroom Management
            </div>
            <h1 className="text-3xl font-bold">Welcome, {user?.name}</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage your coding classrooms, share invitation codes, and monitor enrolled students.
            </p>
          </div>

          <button
            onClick={() => {
              setNewlyCreatedClassroom(null);
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition text-sm shadow-md cursor-pointer shrink-0"
          >
            <Plus size={18} /> Create Classroom
          </button>
        </div>

        {/* Statistics Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#161B22] border border-[#30363D] p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Total Classrooms</p>
              <p className="text-3xl font-bold text-blue-400 mt-1">{classrooms.length}</p>
            </div>
            <School className="w-8 h-8 text-blue-500/40" />
          </div>

          <div className="bg-[#161B22] border border-[#30363D] p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Total Enrolled Students</p>
              <p className="text-3xl font-bold text-green-400 mt-1">{totalStudents}</p>
            </div>
            <Users className="w-8 h-8 text-green-500/40" />
          </div>

          <div className="bg-[#161B22] border border-[#30363D] p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Active Status</p>
              <p className="text-3xl font-bold text-purple-400 mt-1">
                {classrooms.filter((c) => c.isActive).length}
              </p>
            </div>
            <Sparkles className="w-8 h-8 text-purple-500/40" />
          </div>
        </div>

        {/* Classrooms List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">My Classrooms ({classrooms.length})</h2>
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
              <p className="text-sm">Loading your classrooms...</p>
            </div>
          ) : classrooms.length === 0 ? (
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-12 text-center text-gray-400 space-y-4">
              <School className="w-12 h-12 mx-auto text-gray-600" />
              <div>
                <h3 className="text-lg font-bold text-white">No classrooms created yet</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Create your first coding classroom to generate a student joining code.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition cursor-pointer"
              >
                Create Classroom Now
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
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-white line-clamp-1">
                        {c.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          c.isActive
                            ? "bg-green-500/10 text-green-400 border border-green-500/30"
                            : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                        }`}
                      >
                        {c.isActive ? "Active" : "Archived"}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 min-h-[32px]">
                      {c.description || "No description provided."}
                    </p>
                  </div>

                  {/* Join Code Box */}
                  <div className="bg-[#0D1117] border border-[#30363D] p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-gray-500">
                        Join Code
                      </p>
                      <p className="font-mono text-base font-bold text-green-400 tracking-wider">
                        {c.joinCode}
                      </p>
                    </div>

                    <button
                      onClick={() => copyToClipboard(c.joinCode)}
                      title="Copy Join Code"
                      className="p-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-gray-300 hover:text-white transition cursor-pointer"
                    >
                      {copiedCode === c.joinCode ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>

                  {/* Card Meta & Action */}
                  <div className="pt-2 border-t border-[#30363D] flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-blue-400" />
                      {c.studentCount} student{c.studentCount === 1 ? "" : "s"}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <Link
                    to={`/app/teacher/classroom/${c._id}`}
                    className="w-full bg-[#21262D] hover:bg-blue-600 hover:text-white text-gray-200 py-2.5 rounded-xl text-center text-sm font-semibold transition flex items-center justify-center gap-2"
                  >
                    Manage Classroom <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* CREATE CLASSROOM MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            {newlyCreatedClassroom ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
                  <Check size={32} />
                </div>
                <h3 className="text-xl font-bold">Classroom Created!</h3>
                <p className="text-sm text-gray-400">
                  Share this invitation code with your students so they can join{" "}
                  <strong>{newlyCreatedClassroom.name}</strong>:
                </p>

                <div className="bg-[#0D1117] border border-[#30363D] p-4 rounded-xl flex items-center justify-between max-w-xs mx-auto">
                  <span className="font-mono text-2xl font-bold text-green-400 tracking-widest">
                    {newlyCreatedClassroom.joinCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedClassroom.joinCode)}
                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-black text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition"
                  >
                    {copiedCode === newlyCreatedClassroom.joinCode ? (
                      <>
                        <Check size={14} /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copy Code
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setCreateModalOpen(false)}
                    className="w-full bg-[#21262D] hover:bg-[#30363D] text-white py-2.5 rounded-xl font-medium text-sm transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-bold">Create New Classroom</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    A unique join code will be generated automatically.
                  </p>
                </div>

                <form onSubmit={handleCreateClassroom} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                      Classroom Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Data Structures & Algorithms Batch 2027"
                      required
                      className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Weekly problem sets, recursion, graphs, and dynamic programming."
                      rows={3}
                      className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-white resize-none"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCreateModalOpen(false)}
                      className="w-1/2 py-2.5 bg-[#21262D] hover:bg-[#30363D] text-gray-300 font-medium rounded-xl text-sm transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Creating...
                        </>
                      ) : (
                        "Create"
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
