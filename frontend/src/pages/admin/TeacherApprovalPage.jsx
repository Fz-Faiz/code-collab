import { useState, useEffect } from "react";
import DashboardNavbar from "../../components/common/DashboardNavbar";
import { apiRequest } from "../../services/api";
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Mail,
  Calendar,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const TeacherApprovalPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [filter, setFilter] = useState("all"); // 'all' | 'pending' | 'approved' | 'rejected'

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/admin/teachers");
      if (data.success && Array.isArray(data.teachers)) {
        setTeachers(data.teachers);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load teachers list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleApprove = async (id, name) => {
    setActionLoading((prev) => ({ ...prev, [id]: "approve" }));
    try {
      const data = await apiRequest(`/api/admin/teachers/${id}/approve`, {
        method: "PATCH",
      });
      toast.success(data.message || `Approved teacher ${name}`);
      setTeachers((prev) =>
        prev.map((t) => (t._id === id ? { ...t, status: "approved" } : t))
      );
    } catch (err) {
      toast.error(err.message || "Approval failed");
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Are you sure you want to reject registration for ${name}?`)) {
      return;
    }

    setActionLoading((prev) => ({ ...prev, [id]: "reject" }));
    try {
      const data = await apiRequest(`/api/admin/teachers/${id}/reject`, {
        method: "PATCH",
      });
      toast.success(data.message || `Rejected teacher ${name}`);
      setTeachers((prev) =>
        prev.map((t) => (t._id === id ? { ...t, status: "rejected" } : t))
      );
    } catch (err) {
      toast.error(err.message || "Rejection failed");
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const getStatusPill = (status) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Clock size={12} /> Pending Approval
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363D] pb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="text-purple-400" /> Teacher Account Management
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Review and approve faculty applications to grant classroom permissions
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 bg-[#161B22] p-1 rounded-xl border border-[#30363D]">
            {["all", "pending", "approved", "rejected"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${
                  filter === tab
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table / Cards */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
            <p className="text-sm">Loading faculty applications...</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-12 text-center text-gray-400 space-y-2">
            <AlertCircle className="w-10 h-10 mx-auto text-gray-500" />
            <p className="text-base font-semibold">No teachers found</p>
            <p className="text-xs">No teacher accounts match the filter "{filter}".</p>
          </div>
        ) : (
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#21262D] text-gray-400 text-xs uppercase font-semibold border-b border-[#30363D]">
                  <tr>
                    <th className="px-6 py-4">Teacher</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Registered Date</th>
                    <th className="px-6 py-4">Current Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]">
                  {filteredTeachers.map((teacher) => (
                    <tr
                      key={teacher._id}
                      className="hover:bg-[#1C2128] transition duration-150"
                    >
                      <td className="px-6 py-4 font-semibold text-white">
                        {teacher.name}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Mail size={14} className="text-gray-500" />
                          {teacher.email}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-500" />
                          {new Date(teacher.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusPill(teacher.status)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {teacher.status !== "approved" && (
                          <button
                            onClick={() => handleApprove(teacher._id, teacher.name)}
                            disabled={actionLoading[teacher._id] != null}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                          >
                            {actionLoading[teacher._id] === "approve" ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            Approve
                          </button>
                        )}

                        {teacher.status !== "rejected" && (
                          <button
                            onClick={() => handleReject(teacher._id, teacher.name)}
                            disabled={actionLoading[teacher._id] != null}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                          >
                            {actionLoading[teacher._id] === "reject" ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <XCircle size={14} />
                            )}
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherApprovalPage;
