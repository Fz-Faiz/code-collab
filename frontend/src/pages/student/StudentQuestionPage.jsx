import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardNavbar from "../../components/common/DashboardNavbar";
import StudentEditor from "../../components/student/StudentEditor";
import { apiRequest } from "../../services/api";
import {
  ArrowLeft,
  Play,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Code2,
  FileText,
  History,
  Terminal,
  Eye,
  X,
  ExternalLink,
  Bot,
  Sparkles,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";



const STARTER_CODES = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Fast I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Read input from standard input (cin)
    // Write output to standard output (cout)

    return 0;
}
`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Read input from scanner
        // System.out.println(...);
    }
}
`,
  python: `import sys

def main():
    # Read input from standard input (sys.stdin)
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    # Process and print output

if __name__ == '__main__':
    main()
`,
  javascript: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (!input) return;
    // Process input and console.log output
}

main();
`,
};

const LANGUAGE_LABELS = {
  cpp: "C++",
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
};

const StudentQuestionPage = () => {
  const { classroomId, questionId } = useParams();

  // Core Data States
  const [question, setQuestion] = useState(null);
  const [classroom, setClassroom] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Editor States
  const [selectedLanguage, setSelectedLanguage] = useState("cpp");
  const [codePerLang, setCodePerLang] = useState({});
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Tabs States
  const [leftTab, setLeftTab] = useState("description"); // "description" | "submissions"
  const [consoleTab, setConsoleTab] = useState("sample"); // "sample" | "custom" | "verdict"

  // Execution States
  const [runningSample, setRunningSample] = useState(false);
  const [sampleResults, setSampleResults] = useState(null);

  const [customInput, setCustomInput] = useState("");
  const [runningCustom, setRunningCustom] = useState(false);
  const [customResult, setCustomResult] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submissionVerdict, setSubmissionVerdict] = useState(null);

  // Submission Detail Modal
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // AI Tutor States (Unlimited Progressive Hints)
  const [hintsHistory, setHintsHistory] = useState([]);
  const [requestingHint, setRequestingHint] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [aiError, setAiError] = useState(null);

  // Fetch question details, classroom, and submissions
  const fetchData = async () => {
    setLoading(true);
    try {
      const [qData, cData, sData] = await Promise.all([
        apiRequest(`/api/questions/${questionId}`),
        apiRequest(`/api/classrooms/${classroomId}`),
        apiRequest(`/api/questions/${questionId}/submissions`),
      ]);

      if (qData.success && qData.question) {
        setQuestion(qData.question);

        // Pick initial language from supported languages
        const supported = qData.question.supportedLanguages || ["cpp"];
        const initLang = supported[0] || "cpp";
        setSelectedLanguage(initLang);

        // Populate initial starter codes
        const initialCodes = {};
        supported.forEach((lang) => {
          initialCodes[lang] = STARTER_CODES[lang] || "";
        });
        setCodePerLang(initialCodes);
      }

      if (cData.success && cData.classroom) {
        setClassroom(cData.classroom);
      }

      if (sData.success && Array.isArray(sData.submissions)) {
        setSubmissions(sData.submissions);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load problem workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [classroomId, questionId]);

  const currentCode = codePerLang[selectedLanguage] || STARTER_CODES[selectedLanguage] || "";

  const handleCodeChange = (newCode) => {
    setCodePerLang((prev) => ({
      ...prev,
      [selectedLanguage]: newCode,
    }));
  };

  const handleResetStarter = () => {
    if (window.confirm("Reset editor to starter code for " + LANGUAGE_LABELS[selectedLanguage] + "?")) {
      setCodePerLang((prev) => ({
        ...prev,
        [selectedLanguage]: STARTER_CODES[selectedLanguage] || "",
      }));
      toast.success("Starter code reset");
    }
  };

  const handleCopyInput = (input, index) => {
    navigator.clipboard.writeText(input || "");
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Sample input copied");
  };

  // Run visible sample test cases
  const handleRunSampleTests = async () => {
    if (!currentCode.trim()) {
      toast.error("Please write some code before running");
      return;
    }

    setRunningSample(true);
    setConsoleTab("sample");
    try {
      const data = await apiRequest(`/api/questions/${questionId}/run`, {
        method: "POST",
        body: JSON.stringify({
          code: currentCode,
          language: selectedLanguage,
        }),
      });

      if (data.success && data.results) {
        setSampleResults(data.results);
        const allPassed = data.results.every((r) => r.passed);
        if (allPassed) {
          toast.success("All sample test cases passed!");
        } else {
          toast.error("Some sample test cases failed");
        }
      }
    } catch (err) {
      toast.error(err.message || "Execution failed");
    } finally {
      setRunningSample(false);
    }
  };

  // Run with custom input
  const handleRunCustomInput = async () => {
    if (!currentCode.trim()) {
      toast.error("Please write some code before running");
      return;
    }

    setRunningCustom(true);
    setConsoleTab("custom");
    try {
      const data = await apiRequest(`/api/questions/${questionId}/run`, {
        method: "POST",
        body: JSON.stringify({
          code: currentCode,
          language: selectedLanguage,
          customInput,
        }),
      });

      if (data.success && data.result) {
        setCustomResult(data.result);
      }
    } catch (err) {
      toast.error(err.message || "Custom input run failed");
    } finally {
      setRunningCustom(false);
    }
  };

  // Submit solution for automated evaluation
  const handleSubmitSolution = async () => {
    if (!currentCode.trim()) {
      toast.error("Please write some code before submitting");
      return;
    }

    setSubmitting(true);
    setConsoleTab("verdict");
    try {
      const data = await apiRequest(`/api/questions/${questionId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          code: currentCode,
          language: selectedLanguage,
          classroomId,
        }),
      });

      if (data.success && data.submission) {
        setSubmissionVerdict(data.submission);
        if (data.submission.verdict === "Accepted") {
          toast.success("Accepted! All test cases passed!");
        } else {
          toast.error(`Verdict: ${data.submission.verdict}`);
        }

        // Refresh submissions list
        const sData = await apiRequest(`/api/questions/${questionId}/submissions`);
        if (sData.success && Array.isArray(sData.submissions)) {
          setSubmissions(sData.submissions);
        }
      }
    } catch (err) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // View past submission details
  const handleViewSubmission = async (subId) => {
    setLoadingDetail(true);
    try {
      const data = await apiRequest(`/api/submissions/${subId}`);
      if (data.success && data.submission) {
        setSelectedSubmission(data.submission);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load submission details");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Request Adaptive AI Hint (Unlimited Hints: Hint 1, Hint 2, ... Hint N)
  const handleRequestHint = async (queryOverride = null) => {
    const queryToUse = queryOverride !== null ? queryOverride : studentQuery;

    setRequestingHint(true);
    setAiError(null);
    setLeftTab("ai-tutor");

    try {
      const data = await apiRequest("/api/tutor/hint", {
        method: "POST",
        body: JSON.stringify({
          questionId,
          code: currentCode,
          language: selectedLanguage,
          studentQuery: queryToUse?.trim() || undefined,
        }),
      });

      if (data.success && data.hint) {
        const hintNumber = data.hint.hintNumber || hintsHistory.length + 1;
        const newHint = {
          ...data.hint,
          hintNumber,
          studentQuery: queryToUse?.trim() || "",
          timestamp: new Date(),
          progressCategory: data.progressCategory,
        };

        setHintsHistory((prev) => [...prev, newHint]);
        setStudentQuery("");

        toast.success(`AI Tutor provided Hint #${hintNumber}!`);
      } else {
        throw new Error(data.message || "AI Tutor could not generate a hint.");
      }
    } catch (err) {
      console.error("AI Tutor error:", err);
      const msg = err.message || "AI Tutor is temporarily unavailable. Please try again shortly.";
      setAiError(msg);
      toast.error(msg);
    } finally {
      setRequestingHint(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
        <DashboardNavbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-2" />
          <p className="text-sm text-gray-400">Loading coding workspace...</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
        <DashboardNavbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <p className="text-lg text-gray-300">Question not found or unavailable.</p>
          <Link
            to={`/app/student/classroom/${classroomId}`}
            className="text-sm text-green-400 hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Return to Classroom
          </Link>
        </div>
      </div>
    );
  }

  const supportedLanguages = question.supportedLanguages || ["cpp", "java", "python", "javascript"];

  const getVerdictBadge = (verdict) => {
    switch (verdict) {
      case "Accepted":
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
            <CheckCircle2 size={12} /> Accepted
          </span>
        );
      case "Wrong Answer":
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle size={12} /> Wrong Answer
          </span>
        );
      case "Compilation Error":
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle size={12} /> Compilation Error
          </span>
        );
      case "Runtime Error":
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
            <AlertTriangle size={12} /> Runtime Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/30">
            {verdict}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col h-screen overflow-hidden">
      <DashboardNavbar />

      {/* Sub-Header Bar */}
      <header className="bg-[#161B22] border-b border-[#30363D] px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to={`/app/student/classroom/${classroomId}`}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition"
          >
            <ArrowLeft size={14} /> {classroom?.name || "Classroom"}
          </Link>
          <span className="text-gray-600">/</span>
          <h1 className="font-bold text-sm text-white flex items-center gap-2">
            {question.title}
            <span
              className={`text-xs px-2 py-0.5 rounded font-semibold ${
                question.difficulty === "Easy"
                  ? "bg-green-500/15 text-green-400"
                  : question.difficulty === "Hard"
                  ? "bg-red-500/15 text-red-400"
                  : "bg-yellow-500/15 text-yellow-400"
              }`}
            >
              {question.difficulty}
            </span>
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400">Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-[#0D1117] border border-[#30363D] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-green-500 cursor-pointer"
            >
              {supportedLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang] || lang}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleResetStarter}
            title="Reset to starter code"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#30363D] rounded-lg transition"
          >
            <RotateCcw size={15} />
          </button>

          {/* AI Tutor Quick Access Button */}
          <button
            onClick={() => setLeftTab("ai-tutor")}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
              leftTab === "ai-tutor"
                ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30"
            }`}
          >
            <Sparkles size={13} className="text-purple-300" />
            AI Tutor
            {hintsHistory.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-400/30 text-purple-200 font-bold">
                {hintsHistory.length}
              </span>
            )}
          </button>

          {/* Run Code Button */}
          <button
            onClick={handleRunSampleTests}
            disabled={runningSample || submitting}
            className="inline-flex items-center gap-1.5 bg-[#21262D] hover:bg-[#30363D] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-[#30363D] transition disabled:opacity-50 cursor-pointer"
          >
            {runningSample ? (
              <Loader2 size={13} className="animate-spin text-green-400" />
            ) : (
              <Play size={13} className="text-green-400 fill-green-400" />
            )}
            Run
          </button>

          {/* Submit Solution Button */}
          <button
            onClick={handleSubmitSolution}
            disabled={submitting || runningSample}
            className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-black text-xs font-bold px-4 py-1.5 rounded-lg transition disabled:opacity-50 shadow-md cursor-pointer"
          >
            {submitting ? (
              <Loader2 size={13} className="animate-spin text-black" />
            ) : (
              <Send size={13} />
            )}
            Submit
          </button>
        </div>
      </header>

      {/* Main Split Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT PANEL: Problem Details / Submissions / AI Tutor */}
        <section className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-[#30363D] bg-[#0D1117] overflow-hidden">
          {/* Left Panel Tabs */}
          <div className="flex items-center border-b border-[#30363D] bg-[#161B22] px-4 shrink-0">
            <button
              onClick={() => setLeftTab("description")}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
                leftTab === "description"
                  ? "border-green-400 text-white"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <FileText size={14} /> Problem Statement
            </button>
            <button
              onClick={() => setLeftTab("submissions")}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
                leftTab === "submissions"
                  ? "border-green-400 text-white"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <History size={14} /> Submissions ({submissions.length})
            </button>
            <button
              onClick={() => setLeftTab("ai-tutor")}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
                leftTab === "ai-tutor"
                  ? "border-purple-400 text-purple-300 bg-purple-500/10"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <Bot size={14} className="text-purple-400" /> AI Tutor
              {hintsHistory.length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-300 font-bold">
                  {hintsHistory.length}
                </span>
              )}
            </button>
          </div>

          {/* Left Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {leftTab === "description" && (
              <>
                {/* Title & Meta */}
                <div className="space-y-2 pb-4 border-b border-[#30363D]/60">
                  <h2 className="text-2xl font-bold text-white">{question.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        question.difficulty === "Easy"
                          ? "bg-green-500/15 text-green-400"
                          : question.difficulty === "Hard"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-yellow-500/15 text-yellow-400"
                      }`}
                    >
                      {question.difficulty}
                    </span>
                    <span>•</span>
                    <span>Standard I/O</span>
                    <span>•</span>
                    <span>
                      Languages:{" "}
                      {question.supportedLanguages
                        ?.map((l) => LANGUAGE_LABELS[l] || l)
                        .join(", ")}
                    </span>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Description
                  </h3>
                  <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans bg-[#161B22]/50 p-4 rounded-xl border border-[#30363D]/50">
                    {question.description}
                  </div>
                </div>

                {/* Input Format */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Input Format
                  </h3>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap bg-[#161B22]/50 p-3 rounded-xl border border-[#30363D]/50">
                    {question.inputFormat}
                  </div>
                </div>

                {/* Output Format */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Output Format
                  </h3>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap bg-[#161B22]/50 p-3 rounded-xl border border-[#30363D]/50">
                    {question.outputFormat}
                  </div>
                </div>

                {/* Constraints */}
                {question.constraints && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Constraints
                    </h3>
                    <div className="text-sm text-gray-300 font-mono bg-[#161B22]/50 p-3 rounded-xl border border-[#30363D]/50 whitespace-pre-wrap">
                      {question.constraints}
                    </div>
                  </div>
                )}

                {/* Visible Sample Test Cases */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Sample Test Cases
                  </h3>

                  {question.sampleTestCases?.map((sample, idx) => (
                    <div
                      key={idx}
                      className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
                        <span>Sample {idx + 1}</span>
                        <button
                          onClick={() => handleCopyInput(sample.input, idx)}
                          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-green-400 transition"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check size={12} className="text-green-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copy Input
                            </>
                          )}
                        </button>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-gray-400">Input:</span>
                        <pre className="text-xs font-mono bg-[#0D1117] p-2.5 rounded-lg border border-[#30363D]/60 text-gray-200 overflow-x-auto whitespace-pre-wrap">
                          {sample.input || "(Empty input)"}
                        </pre>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-gray-400">
                          Expected Output:
                        </span>
                        <pre className="text-xs font-mono bg-[#0D1117] p-2.5 rounded-lg border border-[#30363D]/60 text-green-300 overflow-x-auto whitespace-pre-wrap">
                          {sample.expectedOutput}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {leftTab === "submissions" && (
              /* Submissions History Tab */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Your Submission History</h3>
                  <span className="text-xs text-gray-400">
                    {submissions.length} Total Submissions
                  </span>
                </div>

                {submissions.length === 0 ? (
                  <div className="text-center py-12 bg-[#161B22] rounded-xl border border-[#30363D] space-y-2">
                    <Code2 className="mx-auto w-8 h-8 text-gray-500" />
                    <p className="text-sm text-gray-400">No submissions yet.</p>
                    <p className="text-xs text-gray-500">
                      Submit your solution on the right to receive an automated verdict.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((sub, idx) => (
                      <div
                        key={sub._id}
                        className="bg-[#161B22] border border-[#30363D] p-3.5 rounded-xl flex items-center justify-between gap-4 hover:border-gray-600 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-gray-400">
                              #{submissions.length - idx}
                            </span>
                            {getVerdictBadge(sub.verdict)}
                            <span className="text-xs text-gray-400">
                              {sub.passedTestCases}/{sub.totalTestCases} Passed
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-2">
                            <span className="uppercase font-semibold text-gray-400">
                              {sub.language}
                            </span>
                            <span>•</span>
                            <span>{new Date(sub.createdAt).toLocaleString()}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleViewSubmission(sub._id)}
                          className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-semibold px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 transition cursor-pointer"
                        >
                          <Eye size={12} /> View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {leftTab === "ai-tutor" && (
              /* AI Tutor Panel */
              <div className="space-y-5">
                {/* AI Tutor Header Card */}
                <div className="bg-gradient-to-r from-purple-950/40 via-[#161B22] to-indigo-950/40 border border-purple-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                        <Bot className="text-purple-400" size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          AI Coding Tutor
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Socratic Mentor
                          </span>
                        </h3>
                        <p className="text-[11px] text-gray-400">
                          Unlimited adaptive hints tailored to your latest code without spoiling the solution.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="space-y-1.5 pt-1 border-t border-[#30363D]/60">
                    <span className="text-[11px] text-gray-400 font-medium">Quick Prompts:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRequestHint("Help me understand the problem requirements and concept.")}
                        disabled={requestingHint}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-blue-300 border border-blue-500/20 transition disabled:opacity-50"
                      >
                        <Lightbulb size={12} className="text-blue-400" /> Explain Concept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestHint("What is the next logical step I should implement?")}
                        disabled={requestingHint}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-purple-300 border border-purple-500/20 transition disabled:opacity-50"
                      >
                        <HelpCircle size={12} className="text-purple-400" /> Next Logical Step
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestHint("Why is my current code or test failing?")}
                        disabled={requestingHint}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-amber-300 border border-amber-500/20 transition disabled:opacity-50"
                      >
                        <Code2 size={12} className="text-amber-400" /> Debug Current Issue
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestHint("What edge cases and constraints should I test?")}
                        disabled={requestingHint}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-emerald-300 border border-emerald-500/20 transition disabled:opacity-50"
                      >
                        <Sparkles size={12} className="text-emerald-400" /> Check Edge Cases
                      </button>
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {aiError && (
                  <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-3 flex items-start justify-between gap-3 text-xs text-red-300">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={14} />
                      <div>
                        <p className="font-semibold">AI Tutor Notice</p>
                        <p className="text-red-300/80 mt-0.5">{aiError}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setAiError(null)}
                      className="text-red-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Hint Feed */}
                <div className="space-y-4">
                  {hintsHistory.length === 0 ? (
                    <div className="text-center py-10 bg-[#161B22] rounded-2xl border border-[#30363D] p-6 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Bot className="text-purple-400" size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-white">No hints requested yet</h4>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                        Stuck or need a nudge? Ask the AI Tutor. It analyzes your latest code and test progress to give targeted, one-bug-at-a-time guidance without giving away the complete solution.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRequestHint("Can you explain the problem and help me get started?")}
                        disabled={requestingHint}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
                      >
                        {requestingHint ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        Request First Hint
                      </button>
                    </div>
                  ) : (
                    hintsHistory.map((item, idx) => {
                      const hintNum = item.hintNumber || (idx + 1);
                      return (
                        <div
                          key={idx}
                          className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4 space-y-3.5 shadow-md"
                        >
                          {/* Hint Metadata Header */}
                          <div className="flex items-center justify-between border-b border-[#30363D]/60 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-purple-500/15 text-purple-300 border-purple-500/30">
                                Hint {hintNum}
                              </span>
                              {item.progressCategory && (
                                <span className="text-[10px] text-gray-400 bg-[#21262D] px-2 py-0.5 rounded-full capitalize">
                                  {item.progressCategory.replace("_", " ")}
                                </span>
                              )}
                              {item.solved && (
                                <span className="text-[10px] font-semibold text-green-400 bg-green-500/15 border border-green-500/30 px-2 py-0.5 rounded-full">
                                  Solved
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          {/* Student query if any */}
                          {item.studentQuery && (
                            <div className="bg-[#0D1117] p-2.5 rounded-xl border border-[#30363D]/50 text-xs text-gray-300 italic flex items-start gap-2">
                              <MessageSquare size={13} className="text-purple-400 shrink-0 mt-0.5" />
                              <span>"{item.studentQuery}"</span>
                            </div>
                          )}

                          {/* Fixed bugs acknowledgment if any */}
                          {item.fixedBugs && item.fixedBugs.length > 0 && (
                            <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                              <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold">Progress Acknowledged:</span>{" "}
                                {item.fixedBugs.join("; ")}
                              </div>
                            </div>
                          )}

                          {/* Hint Title & Text */}
                          <div className="space-y-1.5">
                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                              <Lightbulb size={15} className="text-yellow-400" />
                              {item.hintTitle}
                            </h4>
                            <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-sans bg-[#0D1117]/60 p-3 rounded-xl border border-[#30363D]/40">
                              {item.hintText}
                            </div>
                          </div>

                          {/* Code Snippets if any */}
                          {item.codeSnippets && item.codeSnippets.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] uppercase font-bold text-gray-400">
                                Illustrative Snippet
                              </span>
                              <pre className="text-xs font-mono bg-[#0D1117] p-3 rounded-xl border border-[#30363D] text-purple-300 overflow-x-auto whitespace-pre-wrap">
                                {item.codeSnippets.join("\n\n")}
                              </pre>
                            </div>
                          )}

                          {/* Next Action Callout */}
                          {item.nextAction && (
                            <div className="bg-purple-950/30 border border-purple-500/40 rounded-xl p-3 flex items-start gap-2.5">
                              <ArrowRight className="text-purple-400 shrink-0 mt-0.5" size={14} />
                              <div className="text-xs">
                                <span className="font-bold text-purple-300 block">Recommended Next Action:</span>
                                <span className="text-gray-300 leading-relaxed">{item.nextAction}</span>
                              </div>
                            </div>
                          )}

                          {/* Suggested Follow-ups */}
                          {item.suggestedFollowUps && item.suggestedFollowUps.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] uppercase font-bold text-gray-400 block">
                                Suggested Questions
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {item.suggestedFollowUps.map((prompt, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => handleRequestHint(prompt)}
                                    disabled={requestingHint}
                                    className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-[#21262D] hover:bg-purple-900/30 text-purple-300 hover:text-white border border-[#30363D] hover:border-purple-500/40 transition disabled:opacity-50"
                                  >
                                    💬 {prompt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Interactive Prompt Input */}
                <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-3 space-y-2.5 sticky bottom-0 shadow-xl">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Ask Custom Question or Request Next Hint:</span>
                    <span className="text-purple-400 font-semibold flex items-center gap-1">
                      <Sparkles size={12} /> Next: Hint #{hintsHistory.length + 1}
                    </span>
                  </div>

                  <div className="flex items-end gap-2">
                    <textarea
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (!requestingHint) handleRequestHint();
                        }
                      }}
                      placeholder="e.g. Why is my initialization causing wrong values, or how do I handle duplicates?"
                      rows={2}
                      className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-xl p-2.5 text-xs text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500"
                    />

                    <button
                      type="button"
                      onClick={() => handleRequestHint()}
                      disabled={requestingHint}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-md shrink-0 h-[42px]"
                    >
                      {requestingHint ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      Request Hint
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 flex items-center justify-between">
                    <span>Fresh analysis performed on your latest code for every request.</span>
                    <span>Press Enter to send</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANEL: Editor & Console */}
        <section className="w-full lg:w-1/2 flex flex-col bg-[#161B22] overflow-hidden min-h-0">
          {/* Editor Container */}
          <div className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
            <StudentEditor
              value={currentCode}
              onChange={handleCodeChange}
              language={selectedLanguage}
            />
          </div>

          {/* Bottom Console Drawer */}
          <div className="h-64 border-t border-[#30363D] bg-[#0D1117] flex flex-col shrink-0">
            {/* Console Tab Headers */}
            <div className="flex items-center justify-between border-b border-[#30363D] bg-[#161B22] px-4 shrink-0">
              <div className="flex items-center">
                <button
                  onClick={() => setConsoleTab("sample")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    consoleTab === "sample"
                      ? "border-green-400 text-white"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Play size={12} /> Sample Test Results
                  {sampleResults && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-[#30363D] text-gray-300">
                      {sampleResults.filter((r) => r.passed).length}/{sampleResults.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setConsoleTab("custom")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    consoleTab === "custom"
                      ? "border-green-400 text-white"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Terminal size={12} /> Custom Input
                </button>

                {submissionVerdict && (
                  <button
                    onClick={() => setConsoleTab("verdict")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
                      consoleTab === "verdict"
                        ? "border-green-400 text-white"
                        : "border-transparent text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    <CheckCircle2 size={12} /> Submission Verdict
                  </button>
                )}
              </div>

              {consoleTab === "custom" && (
                <button
                  onClick={handleRunCustomInput}
                  disabled={runningCustom}
                  className="inline-flex items-center gap-1 bg-[#21262D] hover:bg-[#30363D] text-white text-[11px] font-semibold px-2.5 py-1 rounded border border-[#30363D] transition"
                >
                  {runningCustom ? (
                    <Loader2 size={11} className="animate-spin text-green-400" />
                  ) : (
                    <Play size={11} className="text-green-400 fill-green-400" />
                  )}
                  Execute Custom
                </button>
              )}
            </div>

            {/* Console Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
              {consoleTab === "sample" && (
                <div className="space-y-3">
                  {!sampleResults && !runningSample && (
                    <p className="text-gray-500 text-center py-8 font-sans">
                      Click <strong className="text-gray-300">Run</strong> to execute your code against the visible sample test cases.
                    </p>
                  )}

                  {runningSample && (
                    <div className="flex items-center justify-center py-8 gap-2 text-gray-400 font-sans">
                      <Loader2 className="animate-spin text-green-400" size={16} />
                      Executing visible sample test cases...
                    </div>
                  )}

                  {sampleResults &&
                    sampleResults.map((result) => (
                      <div
                        key={result.testIndex}
                        className={`p-3 rounded-lg border ${
                          result.passed
                            ? "bg-green-950/20 border-green-800/40"
                            : "bg-red-950/20 border-red-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold flex items-center gap-1.5">
                            {result.passed ? (
                              <CheckCircle2 size={13} className="text-green-400" />
                            ) : (
                              <XCircle size={13} className="text-red-400" />
                            )}
                            Sample Test {result.testIndex}: {result.passed ? "Passed" : result.status}
                          </span>
                          {result.executionTime > 0 && (
                            <span className="text-gray-500 text-[11px]">
                              {result.executionTime} ms
                            </span>
                          )}
                        </div>

                        {!result.passed && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 pt-2 border-t border-[#30363D]/40">
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-sans">Input</p>
                              <pre className="bg-[#0D1117] p-2 rounded text-gray-300 overflow-x-auto whitespace-pre-wrap">
                                {result.input || "(empty)"}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-sans">Expected Output</p>
                              <pre className="bg-[#0D1117] p-2 rounded text-green-400 overflow-x-auto whitespace-pre-wrap">
                                {result.expectedOutput}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-sans">Actual Output</p>
                              <pre className="bg-[#0D1117] p-2 rounded text-red-400 overflow-x-auto whitespace-pre-wrap">
                                {result.actualOutput || result.error || "(no output)"}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {consoleTab === "custom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[11px] text-gray-400 font-sans font-semibold">
                      Standard Input (stdin):
                    </span>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter custom input here..."
                      className="flex-1 bg-[#161B22] border border-[#30363D] rounded-lg p-2.5 text-xs text-gray-200 font-mono resize-none focus:outline-none focus:border-green-500"
                    />
                  </div>

                  <div className="flex flex-col space-y-1 overflow-hidden">
                    <span className="text-[11px] text-gray-400 font-sans font-semibold">
                      Standard Output:
                    </span>
                    <div className="flex-1 bg-[#161B22] border border-[#30363D] rounded-lg p-2.5 text-xs font-mono overflow-y-auto">
                      {runningCustom && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Loader2 size={13} className="animate-spin text-green-400" />
                          Running...
                        </div>
                      )}
                      {!runningCustom && !customResult && (
                        <span className="text-gray-500">Output will appear here.</span>
                      )}
                      {!runningCustom && customResult && (
                        <div className="space-y-2">
                          {customResult.stdout && (
                            <pre className="text-green-300 whitespace-pre-wrap">
                              {customResult.stdout}
                            </pre>
                          )}
                          {customResult.stderr && (
                            <pre className="text-red-400 whitespace-pre-wrap">
                              {customResult.stderr}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {consoleTab === "verdict" && submissionVerdict && (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      submissionVerdict.verdict === "Accepted"
                        ? "bg-green-950/20 border-green-700/50"
                        : "bg-red-950/20 border-red-700/50"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getVerdictBadge(submissionVerdict.verdict)}
                        <span className="text-sm font-bold text-white">
                          {submissionVerdict.verdict}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-sans">
                        Passed {submissionVerdict.passedTestCases} out of{" "}
                        {submissionVerdict.totalTestCases} automated test cases.
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-bold font-mono">
                        {Math.round(
                          (submissionVerdict.passedTestCases /
                            submissionVerdict.totalTestCases) *
                            100
                        )}
                        %
                      </span>
                    </div>
                  </div>

                  {submissionVerdict.errorMessage && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-sans font-semibold text-gray-400">
                        Error Diagnostic Details:
                      </p>
                      <pre className="bg-[#161B22] p-3 rounded-xl border border-red-500/30 text-red-300 text-xs overflow-x-auto whitespace-pre-wrap">
                        {submissionVerdict.errorMessage}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#161B22] border border-[#30363D] w-full max-w-3xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363D]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-white">Submission Details</h3>
                  {getVerdictBadge(selectedSubmission.verdict)}
                </div>
                <p className="text-xs text-gray-400">
                  {selectedSubmission.passedTestCases}/{selectedSubmission.totalTestCases} Tests Passed •{" "}
                  {selectedSubmission.language.toUpperCase()} • Submitted on{" "}
                  {new Date(selectedSubmission.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 text-gray-400 hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              <span className="text-xs font-semibold text-gray-400 uppercase">
                Submitted Code:
              </span>
              <pre className="bg-[#0D1117] border border-[#30363D] p-4 rounded-xl text-xs font-mono text-gray-200 overflow-x-auto whitespace-pre-wrap">
                {selectedSubmission.code}
              </pre>

              {selectedSubmission.errorMessage && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-red-400 uppercase">
                    Error Log:
                  </span>
                  <pre className="bg-red-950/20 border border-red-800/40 p-3 rounded-xl text-xs font-mono text-red-300 whitespace-pre-wrap">
                    {selectedSubmission.errorMessage}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="bg-[#21262D] hover:bg-[#30363D] text-white text-xs font-semibold px-4 py-2 rounded-xl border border-[#30363D] transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentQuestionPage;
