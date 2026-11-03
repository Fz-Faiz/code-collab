import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DashboardNavbar from "../../components/common/DashboardNavbar";
import { apiRequest } from "../../services/api";
import {
  ArrowLeft,
  Users,
  Calendar,
  Mail,
  Loader2,
  Code2,
  CheckCircle2,
  Clock,
  CircleDashed,
  ArrowRight,
  Filter,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

const StudentClassroomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classData, qData] = await Promise.all([
        apiRequest(`/api/classrooms/${id}`),
        apiRequest(`/api/classrooms/${id}/questions`),
      ]);

      if (classData.success && classData.classroom) {
        setClassroom(classData.classroom);
      }

      if (qData.success && Array.isArray(qData.questions)) {
        setQuestions(qData.questions);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load classroom");
      navigate("/app/student/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
        <DashboardNavbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-2" />
          <p className="text-sm text-gray-400">Loading classroom...</p>
        </div>
      </div>
    );
  }

  // Filtered Questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty =
      difficultyFilter === "all" || q.difficulty === difficultyFilter;
    const matchesStatus =
      statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesDifficulty && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "Solved":
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
            <CheckCircle2 size={12} /> Solved
          </span>
        );
      case "Attempted":
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock size={12} /> Attempted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/30">
            <CircleDashed size={12} /> Not Attempted
          </span>
        );
    }
  };

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty) {
      case "Easy":
        return (
          <span className="text-xs px-2 py-0.5 rounded font-semibold bg-green-500/15 text-green-400">
            Easy
          </span>
        );
      case "Hard":
        return (
          <span className="text-xs px-2 py-0.5 rounded font-semibold bg-red-500/15 text-red-400">
            Hard
          </span>
        );
      default:
        return (
          <span className="text-xs px-2 py-0.5 rounded font-semibold bg-yellow-500/15 text-yellow-400">
            Medium
          </span>
        );
    }
  };

  const solvedCount = questions.filter((q) => q.status === "Solved").length;

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        <Link
          to="/app/student/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={16} /> Back to My Classrooms
        </Link>

        {/* Classroom Header Banner */}
        <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
                Enrolled
              </span>

              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar size={14} /> Enrolled on{" "}
                {new Date(classroom.joinedAt).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-3xl font-bold">{classroom.name}</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              {classroom.description || "No description provided for this classroom."}
            </p>
          </div>

          <div className="bg-[#0D1117] border border-[#30363D] p-5 rounded-2xl flex flex-col gap-2 min-w-[220px]">
            <p className="text-xs uppercase font-semibold text-gray-400">Instructor</p>
            <p className="font-semibold text-base text-white">{classroom.teacherName}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <Mail size={13} /> {classroom.teacherEmail || "faculty@codecollab.com"}
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1.5 pt-1">
              <Users size={13} className="text-blue-400" /> {classroom.studentCount} peers in classroom
            </p>
          </div>
        </div>

        {/* Problem Set Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Code2 className="text-green-400" size={22} /> Coding Problems ({questions.length})
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Solved {solvedCount} of {questions.length} problems in this classroom
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search problem title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#161B22] border border-[#30363D] text-xs text-white pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-green-500 w-44"
                />
              </div>

              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="bg-[#161B22] border border-[#30363D] text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-green-500 cursor-pointer"
              >
                <option value="all">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#161B22] border border-[#30363D] text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-green-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Solved">Solved</option>
                <option value="Attempted">Attempted</option>
                <option value="Not Attempted">Not Attempted</option>
              </select>
            </div>
          </div>

          {/* Question Cards List */}
          {filteredQuestions.length === 0 ? (
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-10 text-center space-y-3">
              <Code2 className="mx-auto w-10 h-10 text-gray-500" />
              <h3 className="text-base font-bold text-white">No questions found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {questions.length === 0
                  ? "Your teacher hasn't assigned any coding problems to this classroom yet."
                  : "No questions match your current search and filter criteria."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredQuestions.map((q) => (
                <div
                  key={q._id}
                  className="bg-[#161B22] border border-[#30363D] hover:border-gray-600 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(q.status)}
                      {getDifficultyBadge(q.difficulty)}
                      <span className="text-xs text-gray-500">
                        Assigned on {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white hover:text-green-400 transition">
                      {q.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                      <span>Supported Languages:</span>
                      {q.supportedLanguages?.map((lang) => (
                        <span
                          key={lang}
                          className="bg-[#0D1117] border border-[#30363D] px-2 py-0.5 rounded text-[11px] font-mono uppercase text-gray-300"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    to={`/app/student/classroom/${id}/question/${q._id}`}
                    className="inline-flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-black text-xs font-bold px-4 py-2 rounded-xl transition shadow cursor-pointer shrink-0"
                  >
                    {q.status === "Solved" ? "Solve Again" : "Solve Problem"} <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentClassroomDetail;
