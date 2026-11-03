import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, Lock, Mail } from "lucide-react";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await login(email.trim(), password);
      toast.success(`Welcome back, ${data.user.name}!`);

      const destination =
        location.state?.from?.pathname ||
        (data.user.role === "admin"
          ? "/app/admin/dashboard"
          : data.user.role === "teacher"
          ? "/app/teacher/dashboard"
          : "/app/student/dashboard");

      navigate(destination, { replace: true });
    } catch (err) {
      setErrorMessage(
        err.message || "Login failed. Please verify your credentials."
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

        <div className="text-center mb-8">
          <img
            src="/code-collab.png"
            alt="Code Collab"
            className="w-16 h-16 mx-auto object-contain mb-3"
          />
          <h1 className="text-2xl font-bold tracking-tight">Sign in to Code Collab</h1>
          <p className="text-sm text-gray-400 mt-1">
            Access your classroom and coding environment
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="••••••••"
                required
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
                <Loader2 size={18} className="animate-spin" /> Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#30363D] text-center text-sm text-gray-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-green-400 hover:underline font-medium"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
