import { io } from 'socket.io-client';

export const initSocket = async () => {
  const rawUrl =
    import.meta.env.VITE_BACKEND_URL || "https://code-collab-th6k.onrender.com";
  const backendUrl = rawUrl.replace(/\/+$/, "");
  return io(backendUrl);
};
