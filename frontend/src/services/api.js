const rawBaseUrl =
  import.meta.env.VITE_BACKEND_URL || "https://code-collab-th6k.onrender.com";
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

/**
 * Universal fetch wrapper with automatic JWT authorization header
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("code_collab_token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${cleanEndpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
