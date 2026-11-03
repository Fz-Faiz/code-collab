import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DashboardNavbar from "../../components/common/DashboardNavbar";
import { apiRequest } from "../../services/api";
import {
  ArrowLeft,
  Users,
  Copy,
  Check,
  Calendar,
  Mail,
  Loader2,
  AlertCircle,
  Archive,
  Plus,
  Code2,
  Edit,
  Trash2,
  FileCode,
  Tag,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  BarChart2,
  Bot,
  GraduationCap,
  Eye,
  X,
  Award,
  HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const TeacherClassroomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [aiAnalytics, setAiAnalytics] = useState(null);
  const [aiAnalyticsLoading, setAiAnalyticsLoading] = useState(true);
  const [studentAnalytics, setStudentAnalytics] = useState([]);
  const [studentAnalyticsLoading, setStudentAnalyticsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchClassroom = async () => {
    try {
      const data = await apiRequest(`/api/classrooms/${id}`);
      if (data.success && data.classroom) {
        setClassroom(data.classroom);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load classroom details");
      navigate("/app/teacher/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const data = await apiRequest(`/api/classrooms/${id}/questions`);
      if (data.success && Array.isArray(data.questions)) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error("Failed to load questions:", err.message);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const fetchAIAnalytics = async () => {
    try {
      const data = await apiRequest(`/api/classrooms/${id}/analytics/ai`);
      if (data.success && data.analytics) {
        setAiAnalytics(data.analytics);
      }
    } catch (err) {
      console.error("Failed to load AI analytics:", err.message);
    } finally {
      setAiAnalyticsLoading(false);
    }
  };

  const fetchStudentAnalytics = async () => {
    try {
      const data = await apiRequest(`/api/classrooms/${id}/analytics/students`);
      if (data.success && Array.isArray(data.students)) {
        setStudentAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to load student analytics:", err.message);
    } finally {
      setStudentAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroom();
    fetchQuestions();
    fetchAIAnalytics();
    fetchStudentAnalytics();
  }, [id]);

  const copyCode = async () => {
    if (!classroom?.joinCode) return;
    try {
      await navigator.clipboard.writeText(classroom.joinCode);
      setCopiedCode(true);
      toast.success("Joining code copied to clipboard!");
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  const handleArchive = async () => {
    if (
      !window.confirm(
        "Are you sure you want to archive this classroom? Students will no longer be able to join using its code."
      )
    ) {
      return;
    }

    setArchiving(true);
    try {
      await apiRequest(`/api/classrooms/${id}`, {
        method: "DELETE",
      });
      toast.success("Classroom archived successfully");
      fetchClassroom();
    } catch (err) {
      toast.error(err.message || "Failed to archive classroom");
    } finally {
      setArchiving(false);
    }
  };

  const handleDeleteQuestion = async (questionId, title) => {
    if (!window.confirm(`Are you sure you want to delete question "${title}"?`)) {
      return;
    }

    setDeletingId(questionId);
    try {
      await apiRequest(`/api/questions/${questionId}`, {
        method: "DELETE",
      });
      toast.success("Question deleted successfully");
      setQuestions((prev) => prev.filter((q) => q._id !== questionId));
    } catch (err) {
      toast.error(err.message || "Failed to delete question");
    } finally {
      setDeletingId(null);
    }
  };

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty) {
      case "Easy":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
            Easy
          </span>
        );
      case "Hard":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            Hard
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
            Medium
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Solved":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30 inline-flex items-center gap-1">
            <CheckCircle2 size={12} /> Solved
          </span>
        );
      case "Attempted":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
            Attempted
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/30">
            Not Attempted
          </span>
        );
    }
  };

  const getVerdictBadge = (verdict) => {
    switch (verdict) {
      case "Accepted":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/30">
            Accepted
          </span>
        );
      case "Wrong Answer":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            Wrong Answer
          </span>
        );
      case "Compilation Error":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Compilation Error
          </span>
        );
      case "Runtime Error":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
            Runtime Error
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/30">
            {verdict || "Not Attempted"}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
        <DashboardNavbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
          <p className="text-sm text-gray-400">Loading classroom data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
        <Link
          to="/app/teacher/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={16} /> Back to My Classrooms
        </Link>

        {/* Classroom Header Banner */}
        <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  classroom.isActive
                    ? "bg-green-500/15 text-green-400 border border-green-500/30"
                    : "bg-gray-500/15 text-gray-400 border border-gray-500/30"
                }`}
              >
                {classroom.isActive ? "Active Classroom" : "Archived"}
              </span>

              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar size={14} /> Created{" "}
                {new Date(classroom.createdAt).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-3xl font-bold">{classroom.name}</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              {classroom.description || "No description specified for this classroom."}
            </p>
          </div>

          {/* Join Code Card */}
          <div className="bg-[#0D1117] border border-[#30363D] p-5 rounded-2xl flex flex-col gap-2 min-w-[240px]">
            <p className="text-xs uppercase font-semibold text-gray-400">
              Student Invitation Code
            </p>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-2xl font-bold text-green-400 tracking-widest">
                {classroom.joinCode}
              </span>
              <button
                onClick={copyCode}
                className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                {copiedCode ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[11px] text-gray-500">
              Students enter this code on their dashboard to enroll.
            </p>
          </div>
        </div>

        {/* SECTION: CLASSROOM QUESTIONS */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363D] pb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Code2 className="text-purple-400" size={20} />
                Classroom Coding Challenges ({questions.length})
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Questions created specifically for this classroom with automated test case evaluation.
              </p>
            </div>

            {classroom.isActive && (
              <Link
                to={`/app/teacher/classroom/${id}/question/new`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-md shrink-0"
              >
                <Plus size={16} /> Add Question
              </Link>
            )}
          </div>

          {questionsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500 mb-2" />
              <p className="text-xs">Loading classroom questions...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-3">
              <FileCode className="w-12 h-12 mx-auto text-gray-600" />
              <p className="font-semibold text-sm text-white">
                No coding questions assigned yet
              </p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Author complete program questions with input, output, constraints, and test cases.
              </p>
              {classroom.isActive && (
                <Link
                  to={`/app/teacher/classroom/${id}/question/new`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition mt-2"
                >
                  <Plus size={14} /> Create First Question
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <div
                  key={q._id}
                  className="bg-[#0D1117] border border-[#30363D] hover:border-gray-600 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-white text-base">{q.title}</h3>
                      {getDifficultyBadge(q.difficulty)}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Tag size={12} className="text-gray-500" />
                        {q.supportedLanguages?.join(", ").toUpperCase()}
                      </span>
                      <span>•</span>
                      <span>{q.sampleTestCasesCount} sample test case{q.sampleTestCasesCount === 1 ? "" : "s"}</span>
                      <span>•</span>
                      <span>Created {new Date(q.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Question Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/app/teacher/classroom/${id}/question/${q._id}/edit`}
                      className="p-2 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-gray-300 hover:text-white transition"
                      title="Edit Question"
                    >
                      <Edit size={16} />
                    </Link>

                    <button
                      onClick={() => handleDeleteQuestion(q._id, q.title)}
                      disabled={deletingId === q._id}
                      className="p-2 rounded-lg bg-[#21262D] hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition cursor-pointer disabled:opacity-50"
                      title="Delete Question"
                    >
                      {deletingId === q._id ? (
                        <Loader2 size={16} className="animate-spin text-red-400" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION: AI TUTOR LEARNING ANALYTICS */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363D] pb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                <Sparkles className="text-purple-400" size={20} />
                AI Tutor Learning Analytics
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Pedagogical engagement insights and hint progression metrics across all students.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shrink-0">
              <ShieldCheck size={14} />
              <span>Private by Design</span>
            </div>
          </div>

          {/* Privacy Notice Banner */}
          <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-3.5 flex items-start gap-3 text-xs text-gray-400">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-gray-200">Student Privacy Guarantee: </strong>
              {aiAnalytics?.privacyNotice ||
                "Metrics are aggregated for pedagogical insights. Private conversations and student code transcripts are never collected or stored."}
            </p>
          </div>

          {aiAnalyticsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500 mb-2" />
              <p className="text-xs">Loading AI learning analytics...</p>
            </div>
          ) : !aiAnalytics || aiAnalytics.totalHintsRequested === 0 ? (
            <div className="py-10 text-center text-gray-400 space-y-2 bg-[#0D1117]/60 rounded-xl border border-[#30363D]/60 p-6">
              <Bot className="w-10 h-10 mx-auto text-purple-400/60" />
              <p className="text-sm font-semibold text-white">No AI Tutor activity recorded yet</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                When students interact with the AI Tutor on assigned challenges, aggregate hints and progression patterns will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 4 Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0D1117] border border-[#30363D] p-4 rounded-xl space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} className="text-purple-400" /> Hints Requested
                  </span>
                  <div className="text-2xl font-bold text-white">
                    {aiAnalytics.totalHintsRequested}
                  </div>
                  <span className="text-[11px] text-gray-500">Across all challenges</span>
                </div>

                <div className="bg-[#0D1117] border border-[#30363D] p-4 rounded-xl space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={13} className="text-blue-400" /> Students Helped
                  </span>
                  <div className="text-2xl font-bold text-white">
                    {aiAnalytics.uniqueStudentsHelped}
                  </div>
                  <span className="text-[11px] text-gray-500">Unique enrolled learners</span>
                </div>

                <div className="bg-[#0D1117] border border-[#30363D] p-4 rounded-xl space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={13} className="text-yellow-400" /> Avg Hints / Student
                  </span>
                  <div className="text-2xl font-bold text-white">
                    {aiAnalytics.avgHintsPerStudent}
                  </div>
                  <span className="text-[11px] text-gray-500">Nudges per active learner</span>
                </div>

                <div className="bg-[#0D1117] border border-[#30363D] p-4 rounded-xl space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-green-400" /> Solved After Hint
                  </span>
                  <div className="text-2xl font-bold text-green-400">
                    {aiAnalytics.solvedAfterHintCount}
                  </div>
                  <span className="text-[11px] text-gray-500">Submissions accepted</span>
                </div>
              </div>

              {/* Hint Level Distribution */}
              <div className="bg-[#0D1117] border border-[#30363D] p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 size={14} className="text-purple-400" /> Hint Level Distribution
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  {[
                    { label: "Level 1: Conceptual", count: aiAnalytics.levelDistribution?.level1 || 0, color: "bg-blue-500", text: "text-blue-400" },
                    { label: "Level 2: Approach", count: aiAnalytics.levelDistribution?.level2 || 0, color: "bg-purple-500", text: "text-purple-400" },
                    { label: "Level 3: Debugging", count: aiAnalytics.levelDistribution?.level3 || 0, color: "bg-amber-500", text: "text-amber-400" },
                    { label: "Level 4: Edge Cases", count: aiAnalytics.levelDistribution?.level4 || 0, color: "bg-emerald-500", text: "text-emerald-400" },
                  ].map((lvl, lIdx) => {
                    const pct = aiAnalytics.totalHintsRequested > 0
                      ? Math.round((lvl.count / aiAnalytics.totalHintsRequested) * 100)
                      : 0;
                    return (
                      <div key={lIdx} className="bg-[#161B22] p-3 rounded-lg border border-[#30363D]/60 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-semibold ${lvl.text}`}>{lvl.label}</span>
                          <span className="text-gray-300 font-bold">{lvl.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-[#0D1117] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${lvl.color} rounded-full`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Per-Question Engagement Breakdown Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Question-Level Learning Breakdown
                </h3>
                <div className="overflow-x-auto border border-[#30363D] rounded-xl bg-[#0D1117]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#21262D] text-gray-400 uppercase font-semibold border-b border-[#30363D]">
                      <tr>
                        <th className="px-5 py-3">Question Title</th>
                        <th className="px-5 py-3">Difficulty</th>
                        <th className="px-5 py-3">Hints Requested</th>
                        <th className="px-5 py-3">Students Helped</th>
                        <th className="px-5 py-3">Solved After Hint</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363D]">
                      {aiAnalytics.questionBreakdown?.map((item) => (
                        <tr key={item.questionId} className="hover:bg-[#161B22]/50 transition">
                          <td className="px-5 py-3 font-semibold text-white">
                            {item.title}
                          </td>
                          <td className="px-5 py-3">
                            {getDifficultyBadge(item.difficulty)}
                          </td>
                          <td className="px-5 py-3 font-mono font-bold text-purple-400">
                            {item.hintsRequested}
                          </td>
                          <td className="px-5 py-3 font-mono text-gray-300">
                            {item.uniqueStudents}
                          </td>
                          <td className="px-5 py-3 font-mono text-green-400">
                            {item.solvedAfterHint}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION: STUDENT PROGRESS & AI HINT ANALYTICS */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#30363D] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <GraduationCap size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Student Progress & AI Hint Analytics</h2>
                <p className="text-xs text-gray-400">
                  Track individual student challenge completion, hint reliance, and solving efficiency.
                </p>
              </div>
            </div>
          </div>

          {studentAnalyticsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-xs">Loading student progress analytics...</p>
            </div>
          ) : !studentAnalytics || !studentAnalytics.students || studentAnalytics.students.length === 0 ? (
            <div className="py-10 text-center text-gray-400 space-y-2 bg-[#0D1117]/60 rounded-xl border border-[#30363D]/60 p-6">
              <GraduationCap className="w-10 h-10 mx-auto text-indigo-400/60" />
              <p className="text-sm font-semibold text-white">No enrolled students in this classroom</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Once students join the classroom, their individual question progress and hint statistics will be displayed here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#30363D] rounded-xl bg-[#0D1117]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#21262D] text-gray-400 uppercase font-semibold border-b border-[#30363D]">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-4 py-3.5 text-center">Assigned</th>
                    <th className="px-4 py-3.5 text-center">Attempted</th>
                    <th className="px-4 py-3.5 text-center">Solved</th>
                    <th className="px-4 py-3.5 text-center">Total Hints</th>
                    <th className="px-4 py-3.5 text-center">Avg Hints / Solved</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]">
                  {studentAnalytics.students.map((student) => (
                    <tr
                      key={student.studentId}
                      className="hover:bg-[#161B22]/70 transition group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{student.name}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Mail size={11} className="text-gray-500" />
                          <span>{student.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-gray-300">
                        {student.assignedQuestions}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-yellow-400 font-medium">
                        {student.attemptedQuestions}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                          {student.solvedQuestions}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-purple-400">
                        {student.totalHints}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-gray-200">
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded border border-indigo-500/20">
                          {student.avgHintsPerSolvedQuestion}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-lg transition cursor-pointer"
                        >
                          <Eye size={13} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION: ENROLLED STUDENTS */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users size={20} className="text-blue-400" />
              Enrolled Students ({classroom.studentCount || 0})
            </h2>

            {classroom.isActive && (
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 transition cursor-pointer"
              >
                <Archive size={14} /> Archive Classroom
              </button>
            )}
          </div>

          {!classroom.students || classroom.students.length === 0 ? (
            <div className="p-8 text-center text-gray-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-gray-600" />
              <p className="font-semibold text-sm">No students have joined yet</p>
              <p className="text-xs text-gray-500">
                Share join code <strong className="text-green-400">{classroom.joinCode}</strong> with your students to begin.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#21262D] text-gray-400 text-xs uppercase font-semibold border-b border-[#30363D]">
                  <tr>
                    <th className="px-6 py-3">Student Name</th>
                    <th className="px-6 py-3">Email Address</th>
                    <th className="px-6 py-3">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]">
                  {classroom.students.map((student) => (
                    <tr key={student._id} className="hover:bg-[#1C2128] transition">
                      <td className="px-6 py-3.5 font-semibold text-white">
                        {student.name}
                      </td>
                      <td className="px-6 py-3.5 text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Mail size={14} className="text-gray-500" />
                          {student.email}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-gray-400 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-500" />
                          {new Date(student.joinedAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* INDIVIDUAL STUDENT PROGRESS MODAL */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363D] bg-[#21262D]/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {selectedStudent.name}
                      <span className="text-xs px-2 py-0.5 rounded-full font-normal bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        Student Progress
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Mail size={12} className="text-gray-500" />
                      {selectedStudent.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#30363D] transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 8 Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Assigned
                    </span>
                    <div className="text-xl font-bold text-white">
                      {selectedStudent.assignedQuestions}
                    </div>
                    <span className="text-[10px] text-gray-500">Total classroom challenges</span>
                  </div>

                  <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-yellow-400 uppercase tracking-wider">
                      Attempted
                    </span>
                    <div className="text-xl font-bold text-yellow-400">
                      {selectedStudent.attemptedQuestions}
                    </div>
                    <span className="text-[10px] text-gray-500">Challenges with submissions</span>
                  </div>

                  <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wider">
                      Solved
                    </span>
                    <div className="text-xl font-bold text-green-400">
                      {selectedStudent.solvedQuestions}
                    </div>
                    <span className="text-[10px] text-gray-500">Accepted verdicts</span>
                  </div>

                  <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Unsolved
                    </span>
                    <div className="text-xl font-bold text-gray-300">
                      {selectedStudent.unsolvedQuestions}
                    </div>
                    <span className="text-[10px] text-gray-500">Remaining to solve</span>
                  </div>

                  <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={11} /> Total AI Hints
                    </span>
                    <div className="text-xl font-bold text-purple-400">
                      {selectedStudent.totalHints}
                    </div>
                    <span className="text-[10px] text-gray-500">All hints requested</span>
                  </div>

                  <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp size={11} /> Avg Hints / Solved
                    </span>
                    <div className="text-xl font-bold text-indigo-300">
                      {selectedStudent.avgHintsPerSolvedQuestion}
                    </div>
                    <span className="text-[10px] text-gray-500">Hints prior to solve</span>
                  </div>

                  <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <Award size={11} /> Solved w/o AI
                    </span>
                    <div className="text-xl font-bold text-emerald-400">
                      {selectedStudent.solvedWithoutAI}
                    </div>
                    <span className="text-[10px] text-gray-500">Solved independently</span>
                  </div>

                  <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded-xl space-y-1">
                    <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                      <Bot size={11} /> Solved with AI
                    </span>
                    <div className="text-xl font-bold text-blue-400">
                      {selectedStudent.solvedWithAI}
                    </div>
                    <span className="text-[10px] text-gray-500">Assisted by AI Tutor</span>
                  </div>
                </div>

                {/* Question-Level Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle size={14} className="text-indigo-400" />
                      Assigned Question Progress & Hints Breakdown
                    </h4>
                    <span className="text-xs text-gray-500">
                      * AI hints used before first Accepted submission count toward solve metrics
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-[#30363D] rounded-xl bg-[#0D1117]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#21262D] text-gray-400 uppercase font-semibold border-b border-[#30363D]">
                        <tr>
                          <th className="px-4 py-3">Question Title</th>
                          <th className="px-3 py-3">Difficulty</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3 text-center">Attempts</th>
                          <th className="px-4 py-3 text-center">Hints Used (Before Solve)</th>
                          <th className="px-4 py-3">Final Verdict</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#30363D]">
                        {selectedStudent.questions?.map((q) => (
                          <tr key={q.questionId} className="hover:bg-[#161B22]/50 transition">
                            <td className="px-4 py-3 font-semibold text-white">
                              {q.title}
                            </td>
                            <td className="px-3 py-3">
                              {getDifficultyBadge(q.difficulty)}
                            </td>
                            <td className="px-3 py-3">
                              {getStatusBadge(q.status)}
                            </td>
                            <td className="px-3 py-3 text-center font-mono text-gray-300">
                              {q.attempts}
                            </td>
                            <td className="px-4 py-3 text-center font-mono">
                              <span className={`font-bold ${q.hintsBeforeSolved > 0 ? "text-purple-400" : "text-gray-400"}`}>
                                {q.hintsBeforeSolved}
                              </span>
                              {q.totalHints > q.hintsBeforeSolved && (
                                <span className="text-[10px] text-gray-500 ml-1">
                                  ({q.totalHints} total)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {getVerdictBadge(q.finalVerdict)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-[#30363D] bg-[#21262D]/30 flex justify-end">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-gray-300 hover:text-white bg-[#30363D] hover:bg-[#30363D]/80 rounded-lg transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherClassroomDetail;
