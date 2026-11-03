import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DashboardNavbar from "../../components/common/DashboardNavbar";
import { apiRequest } from "../../services/api";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Code2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";

const AVAILABLE_LANGUAGES = [
  { id: "cpp", label: "C++" },
  { id: "java", label: "Java" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
];

const QuestionFormPage = () => {
  const { classroomId, questionId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(questionId);

  // Form states
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [supportedLanguages, setSupportedLanguages] = useState([
    "cpp",
    "java",
    "python",
    "javascript",
  ]);
  const [description, setDescription] = useState("");
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [constraints, setConstraints] = useState("");

  const [sampleTestCases, setSampleTestCases] = useState([
    { input: "", expectedOutput: "" },
  ]);

  const [hiddenTestCases, setHiddenTestCases] = useState([
    { input: "", expectedOutput: "" },
  ]);

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [classroomName, setClassroomName] = useState("");

  // Load question data if editing
  useEffect(() => {
    const fetchClassroomAndQuestion = async () => {
      try {
        const classData = await apiRequest(`/api/classrooms/${classroomId}`);
        if (classData.success && classData.classroom) {
          setClassroomName(classData.classroom.name);
        }

        if (isEditing) {
          const qData = await apiRequest(`/api/questions/${questionId}`);
          if (qData.success && qData.question) {
            const q = qData.question;
            setTitle(q.title);
            setDifficulty(q.difficulty);
            setSupportedLanguages(q.supportedLanguages || []);
            setDescription(q.description);
            setInputFormat(q.inputFormat);
            setOutputFormat(q.outputFormat);
            setConstraints(q.constraints || "");
            setSampleTestCases(
              q.sampleTestCases?.length
                ? q.sampleTestCases.map((tc) => ({
                    input: tc.input || "",
                    expectedOutput: tc.expectedOutput || "",
                  }))
                : [{ input: "", expectedOutput: "" }]
            );
            setHiddenTestCases(
              q.hiddenTestCases?.length
                ? q.hiddenTestCases.map((tc) => ({
                    input: tc.input || "",
                    expectedOutput: tc.expectedOutput || "",
                  }))
                : [{ input: "", expectedOutput: "" }]
            );
          }
        }
      } catch (err) {
        toast.error(err.message || "Failed to load data");
        navigate(`/app/teacher/classroom/${classroomId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchClassroomAndQuestion();
  }, [classroomId, questionId, isEditing, navigate]);

  // Language toggle helper
  const toggleLanguage = (langId) => {
    if (supportedLanguages.includes(langId)) {
      if (supportedLanguages.length === 1) {
        toast.error("At least one language must be selected");
        return;
      }
      setSupportedLanguages(supportedLanguages.filter((l) => l !== langId));
    } else {
      setSupportedLanguages([...supportedLanguages, langId]);
    }
  };

  // Sample test cases helpers
  const handleSampleChange = (index, field, value) => {
    const updated = [...sampleTestCases];
    updated[index][field] = value;
    setSampleTestCases(updated);
  };

  const addSampleTestCase = () => {
    setSampleTestCases([...sampleTestCases, { input: "", expectedOutput: "" }]);
  };

  const removeSampleTestCase = (index) => {
    if (sampleTestCases.length <= 1) {
      toast.error("At least one sample test case is required");
      return;
    }
    setSampleTestCases(sampleTestCases.filter((_, i) => i !== index));
  };

  // Hidden test cases helpers
  const handleHiddenChange = (index, field, value) => {
    const updated = [...hiddenTestCases];
    updated[index][field] = value;
    setHiddenTestCases(updated);
  };

  const addHiddenTestCase = () => {
    setHiddenTestCases([...hiddenTestCases, { input: "", expectedOutput: "" }]);
  };

  const removeHiddenTestCase = (index) => {
    if (hiddenTestCases.length <= 1) {
      toast.error("At least one hidden test case is required");
      return;
    }
    setHiddenTestCases(hiddenTestCases.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!title.trim()) {
      toast.error("Question title is required");
      return;
    }
    if (!description.trim()) {
      toast.error("Problem description is required");
      return;
    }
    if (!inputFormat.trim()) {
      toast.error("Input format is required");
      return;
    }
    if (!outputFormat.trim()) {
      toast.error("Output format is required");
      return;
    }
    if (supportedLanguages.length === 0) {
      toast.error("Please select at least one supported language");
      return;
    }

    const invalidSample = sampleTestCases.some(
      (tc) => !tc.expectedOutput || !tc.expectedOutput.trim()
    );
    if (invalidSample) {
      toast.error("All sample test cases must have expected output");
      return;
    }

    const invalidHidden = hiddenTestCases.some(
      (tc) => !tc.expectedOutput || !tc.expectedOutput.trim()
    );
    if (invalidHidden) {
      toast.error("All hidden test cases must have expected output");
      return;
    }

    const payload = {
      title: title.trim(),
      difficulty,
      supportedLanguages,
      description: description.trim(),
      inputFormat: inputFormat.trim(),
      outputFormat: outputFormat.trim(),
      constraints: constraints.trim(),
      sampleTestCases: sampleTestCases.map((tc) => ({
        input: tc.input || "",
        expectedOutput: tc.expectedOutput.trim(),
      })),
      hiddenTestCases: hiddenTestCases.map((tc) => ({
        input: tc.input || "",
        expectedOutput: tc.expectedOutput.trim(),
      })),
    };

    setSubmitting(true);
    try {
      if (isEditing) {
        await apiRequest(`/api/questions/${questionId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Question updated successfully!");
      } else {
        await apiRequest(`/api/classrooms/${classroomId}/questions`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Question created successfully!");
      }
      navigate(`/app/teacher/classroom/${classroomId}`);
    } catch (err) {
      toast.error(err.message || "Failed to save question");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
        <DashboardNavbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
          <p className="text-sm text-gray-400">Loading question form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        <Link
          to={`/app/teacher/classroom/${classroomId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={16} /> Back to Classroom ({classroomName || "Classroom"})
        </Link>

        {/* Page Header */}
        <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div>
            <span className="text-xs font-semibold uppercase text-purple-400 tracking-wider">
              {isEditing ? "Edit Challenge" : "Author New Challenge"}
            </span>
            <h1 className="text-2xl font-bold mt-1">
              {isEditing ? `Edit: ${title || "Question"}` : "Create Codeforces-Style Question"}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Questions belong exclusively to this classroom. Students write complete programs evaluated against your test cases.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: BASIC INFORMATION */}
          <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-2xl space-y-5 shadow-lg">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-[#30363D] pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold">
                1
              </span>
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                  Question Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Next Permutation or Two Sum"
                  required
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                    Difficulty Level *
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 text-white cursor-pointer"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                    Supported Languages *
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {AVAILABLE_LANGUAGES.map((lang) => {
                      const selected = supportedLanguages.includes(lang.id);
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => toggleLanguage(lang.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            selected
                              ? "bg-blue-500/20 border-blue-500 text-blue-400"
                              : "bg-[#0D1117] border-[#30363D] text-gray-400 hover:text-white"
                          }`}
                        >
                          {lang.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PROBLEM DESCRIPTION */}
          <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-2xl space-y-5 shadow-lg">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-[#30363D] pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold">
                2
              </span>
              Problem Statement
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                  Problem Description (Markdown Supported) *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a detailed problem statement..."
                  rows={6}
                  required
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl p-4 text-sm outline-none focus:border-blue-500 text-white font-mono leading-relaxed resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                    Input Format *
                  </label>
                  <textarea
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value)}
                    placeholder="e.g. The first line contains an integer T, the number of test cases..."
                    rows={3}
                    required
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl p-3 text-xs outline-none focus:border-blue-500 text-white resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                    Output Format *
                  </label>
                  <textarea
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    placeholder="e.g. Output the answer for each test case on a new line."
                    rows={3}
                    required
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl p-3 text-xs outline-none focus:border-blue-500 text-white resize-y"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                  Constraints (Optional)
                </label>
                <input
                  type="text"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="e.g. 1 <= N <= 10^5, -10^9 <= A[i] <= 10^9"
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: SAMPLE TEST CASES */}
          <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-2xl space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center justify-center font-bold">
                  3
                </span>
                Sample Test Cases (Visible to Students)
              </h2>

              <button
                type="button"
                onClick={addSampleTestCase}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 transition cursor-pointer"
              >
                <Plus size={14} /> Add Sample Case
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Sample test cases are visible to students in the problem description and sample runner.
            </p>

            <div className="space-y-4">
              {sampleTestCases.map((tc, idx) => (
                <div
                  key={idx}
                  className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300">
                      Sample Test Case #{idx + 1}
                    </span>
                    {sampleTestCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSampleTestCase(idx)}
                        className="text-red-400 hover:text-red-300 transition p-1"
                        title="Remove test case"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
                        Input (stdin)
                      </label>
                      <textarea
                        value={tc.input}
                        onChange={(e) =>
                          handleSampleChange(idx, "input", e.target.value)
                        }
                        placeholder="e.g. 5&#10;1 2 3 4 5"
                        rows={3}
                        className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-2.5 text-xs outline-none focus:border-green-500 font-mono text-gray-200 resize-y"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
                        Expected Output (stdout) *
                      </label>
                      <textarea
                        value={tc.expectedOutput}
                        onChange={(e) =>
                          handleSampleChange(idx, "expectedOutput", e.target.value)
                        }
                        placeholder="e.g. 15"
                        rows={3}
                        required
                        className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-2.5 text-xs outline-none focus:border-green-500 font-mono text-gray-200 resize-y"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: HIDDEN TEST CASES */}
          <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-2xl space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold">
                  4
                </span>
                Hidden Test Cases (Grading Suite)
              </h2>

              <button
                type="button"
                onClick={addHiddenTestCase}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition cursor-pointer"
              >
                <Plus size={14} /> Add Hidden Case
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Hidden test cases evaluate official student submissions. They are strictly protected and never exposed to students.
            </p>

            <div className="space-y-4">
              {hiddenTestCases.map((tc, idx) => (
                <div
                  key={idx}
                  className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300">
                      Hidden Test Case #{idx + 1}
                    </span>
                    {hiddenTestCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeHiddenTestCase(idx)}
                        className="text-red-400 hover:text-red-300 transition p-1"
                        title="Remove test case"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
                        Input (stdin)
                      </label>
                      <textarea
                        value={tc.input}
                        onChange={(e) =>
                          handleHiddenChange(idx, "input", e.target.value)
                        }
                        placeholder="Test input..."
                        rows={3}
                        className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-2.5 text-xs outline-none focus:border-purple-500 font-mono text-gray-200 resize-y"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
                        Expected Output (stdout) *
                      </label>
                      <textarea
                        value={tc.expectedOutput}
                        onChange={(e) =>
                          handleHiddenChange(idx, "expectedOutput", e.target.value)
                        }
                        placeholder="Exact expected output..."
                        rows={3}
                        required
                        className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-2.5 text-xs outline-none focus:border-purple-500 font-mono text-gray-200 resize-y"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SUBMIT BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              to={`/app/teacher/classroom/${classroomId}`}
              className="px-6 py-2.5 rounded-xl border border-[#30363D] text-gray-300 hover:bg-[#21262D] text-sm font-semibold transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition flex items-center gap-2 cursor-pointer shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : isEditing ? (
                "Update Question"
              ) : (
                "Save & Publish Question"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default QuestionFormPage;
