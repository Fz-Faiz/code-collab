import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("code_collab_token"));
  const [loading, setLoading] = useState(true);

  // Restore session from token on mount / refresh
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem("code_collab_token");
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest("/api/auth/me");
        if (data.success && data.user) {
          setUser(data.user);
          setToken(storedToken);
        } else {
          logout();
        }
      } catch (err) {
        console.error("Session restore failed:", err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data.success && data.token) {
      localStorage.setItem("code_collab_token", data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const register = async (name, email, password, role) => {
    const data = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    });

    // If role is student, auto-login with returned token
    if (data.success && data.token && data.user?.role === "student") {
      localStorage.setItem("code_collab_token", data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem("code_collab_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
