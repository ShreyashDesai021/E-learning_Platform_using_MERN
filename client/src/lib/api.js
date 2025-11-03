// client/src/lib/api.js
import axios from "axios";

/**
 * Shared Axios instance for the frontend.
 * Uses Vite env var VITE_API_BASE_URL (e.g. "http://localhost:5000/api/v1")
 * Sets withCredentials true if your server uses cookies.
 * Automatically attaches Bearer token from localStorage if present.
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
  // IMPORTANT: do NOT set a global "Content-Type" header here.
  // If you set Content-Type globally, FormData uploads lose their boundary
  // and multer / busboy cannot parse multipart requests.
});

// 🔹 Request interceptor — attach Bearer token automatically
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // IMPORTANT: ensure we do not overwrite Content-Type for FormData requests
      // If caller sets config.data to FormData, leave browser to set header.
      if (config.data instanceof FormData && config.headers) {
        // delete any Content-Type so browser/axios sets boundary properly
        if (config.headers["Content-Type"]) delete config.headers["Content-Type"];
        if (config.headers["content-type"]) delete config.headers["content-type"];
      }
    } catch {
      // ignore errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔹 Response interceptor — handle errors globally (optional)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      // Optional global handling
      // localStorage.removeItem("token");
      // window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
