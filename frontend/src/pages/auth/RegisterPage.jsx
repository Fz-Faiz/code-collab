import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowLeft,
  User,
  Mail,
  Lock,
  GraduationCap,
  BookOpen,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name || !email || !password) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await register(name, email, password, role);

      if (role === "teacher") {
        toast.success(
          "Teacher registration submitted! Please wait for administrator approval.",
          { duration: 6000 }
        );
        navigate("/login");
      } else {
        toast.success("Account created successfully! Welcome to Code Collab.");
        navigate("/app/student/dashboard");
      }
    } catch (err) {
      setErrorMessage(
        err.message || "Registration failed. Please check your information."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#0D1117] text-white p-4">
      <div className="w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-2xl p-8 shadow-2xl relative">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-400 mb-6 transition"
        >
          <ArrowLeft size={14} /> Back to Multiplayer Coding
        </Link>

        <div className="text-center mb-6">
          <img
            src="/code-collab.png"
            alt="Code Collab"
            className="w-16 h-16 mx-auto object-contain mb-3"
          />
          <h1 className="text-2xl font-bold tracking-tight">Create your Account</h1>
          <p className="text-sm text-gray-400 mt-1">
            Join Code Collab's educational platform
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              I am registering as:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                  role === "student"
                    ? "bg-green-500/10 border-green-500 text-green-400"
                    : "bg-[#0D1117] border-[#30363D] text-gray-400 hover:border-gray-500"
                }`}
              >
                <GraduationCap size={18} /> Student
              </button>

              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                  role === "teacher"
                    ? "bg-blue-500/10 border-blue-500 text-blue-400"
                    : "bg-[#0D1117] border-[#30363D] text-gray-400 hover:border-gray-500"
                }`}
              >
                <BookOpen size={18} /> Teacher
              </button>
            </div>
          </div>

          {role === "teacher" && (
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-start gap-2.5">
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> Teacher accounts require verification and
                approval by an administrator before access is granted.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-green-500 transition text-gray-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-green-500 transition text-gray-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg pl-10 pr-11 py-2.5 text-sm outline-none focus:border-green-500 transition text-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Creating account...
              </>
            ) : (
              "Complete Registration"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#30363D] text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-green-400 hover:underline font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
