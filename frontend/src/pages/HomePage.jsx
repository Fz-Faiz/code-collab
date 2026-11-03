import { useState } from "react";
import { v4 as uuidV4 } from "uuid";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  GraduationCap,
  LogIn,
  ArrowRight,
  Code,
  CheckCircle2,
} from "lucide-react";

const HomePage = () => {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidV4();
    setRoomId(id);
    toast.success("Created a new room");
  };

  const joinRoom = () => {
    if (!username || !roomId) {
      toast.error("RoomId or Username missing");
      return;
    }
    navigate(`/editor/${roomId}`, {
      state: {
        username,
      },
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      joinRoom();
    }
  };

  const handleEnterClassroom = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (user.role === "admin") {
      navigate("/app/admin/dashboard");
    } else if (user.role === "teacher") {
      if (user.status === "approved") {
        navigate("/app/teacher/dashboard");
      } else {
        toast.error(`Teacher account is ${user.status}. Awaiting admin approval.`);
        navigate("/app/teacher/dashboard");
      }
    } else {
      navigate("/app/student/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#0D1117] text-white p-6 relative">
      {/* Top Navbar */}
      <header className="w-full max-w-5xl flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <img
            src="/code-collab.png"
            alt="Code Collab"
            className="w-9 h-9 object-contain"
          />
          <span className="font-bold text-lg tracking-wide">Code Collab</span>
        </div>

        <div>
          {isAuthenticated ? (
            <button
              onClick={handleEnterClassroom}
              className="flex items-center gap-2 px-4 py-2 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] hover:border-gray-500 text-sm font-medium text-gray-200 hover:text-white rounded-xl transition shadow-sm cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              <span>Dashboard ({user.name})</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] hover:border-gray-500 text-sm font-medium text-gray-200 hover:text-white rounded-xl transition shadow-sm"
            >
              <LogIn size={16} className="text-green-400" />
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Two-Section Grid */}
      <main className="my-auto py-8 w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* SECTION A: MULTIPLAYER CODE EDITOR (PRESERVED EXACTLY) */}
        <div className="flex flex-col items-center gap-4 bg-[#161B22] p-8 rounded-xl border border-[#30363D] w-96 shadow-lg h-[460px] justify-between">
          <img
            src="/code-collab.png"
            className="w-32 h-32 object-contain"
            alt="code-collab-logo"
          />

          <h3 className="text-gray-400 text-center mr-auto">
            Paste invitation Room ID
          </h3>

          <div className="flex flex-col gap-3 w-full">
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-4 py-2 outline-none focus:border-green-500"
            />

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-4 py-2 outline-none focus:border-green-500"
            />

            <button
              type="submit"
              onClick={joinRoom}
              className="w-20 ml-auto bg-green-500 hover:bg-green-600 py-2 rounded-lg font-medium transition cursor-pointer"
            >
              Join
            </button>
          </div>

          <p className="text-sm text-gray-400">
            If you don't have an invite then create{" "}
            <button
              onClick={createNewRoom}
              type="button"
              className="text-green-400 hover:underline cursor-pointer"
            >
              new room
            </button>
          </p>
        </div>

        {/* SECTION B: CLASSROOM PORTAL (NEW SECTION) */}
        <div className="flex flex-col items-center gap-4 bg-[#161B22] p-8 rounded-xl border border-[#30363D] w-96 shadow-lg h-[460px] justify-between">
          <div className="w-32 h-32 flex items-center justify-center rounded-2xl bg-gradient-to-br from-green-500/15 to-blue-500/10 border border-green-500/30">
            <GraduationCap className="w-16 h-16 text-green-400" />
          </div>

          <div className="text-center w-full">
            <h2 className="text-xl font-bold text-white">Classroom Coding</h2>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              Learn, practice and solve coding problems in classrooms created by your teachers.
            </p>
          </div>

          <div className="w-full space-y-2.5 text-xs text-gray-300 bg-[#0D1117] p-3 rounded-lg border border-[#30363D]/60">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-400 shrink-0" />
              <span>Join teacher classrooms with code</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-blue-400 shrink-0" />
              <span>Complete program automated test grading</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
              <span>Socratic progressive AI tutoring hints</span>
            </div>
          </div>

          <div className="w-full">
            <button
              type="button"
              onClick={handleEnterClassroom}
              className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-2.5 rounded-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <LogIn size={18} />
              Enter Classroom
            </button>
          </div>

          <p className="text-sm text-gray-400">
            {isAuthenticated ? (
              <span>
                Role: <strong className="text-green-400 capitalize">{user?.role}</strong>
              </span>
            ) : (
              <span>
                New here?{" "}
                <Link to="/register" className="text-green-400 hover:underline">
                  Create account
                </Link>
              </span>
            )}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-sm text-gray-500 py-2">
        Made with ❤️ by{" "}
        <a
          href="https://github.com/Fz-Faiz"
          className="text-green-400 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Fz-Faiz
        </a>
      </footer>
    </div>
  );
};

export default HomePage;
