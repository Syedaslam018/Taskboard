import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // sends the httpOnly refresh-token cookie
});

// Attach the in-memory access token to every request. The access token is
// never stored in localStorage - only kept in memory (Zustand) - to reduce
// the blast radius of an XSS attack.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

// On a 401, try exactly one silent refresh (via the httpOnly cookie), then
// replay the original request. Concurrent 401s share a single refresh call.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest?._retry || originalRequest?.url?.includes("/auth/")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      try {
      const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        pendingQueue.forEach((resolve) => resolve());
        pendingQueue = [];
      } catch (refreshErr) {
        useAuthStore.getState().clear();
        pendingQueue = [];
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return new Promise((resolve) => {
      pendingQueue.push(() => resolve(api(originalRequest)));
    });
  }
);
