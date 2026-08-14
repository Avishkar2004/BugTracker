import axios from "axios";

export const TOKEN_KEY = "bugtracker.token";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // An expired or revoked token should drop the user back to the login screen.
    if (status === 401 && localStorage.getItem(TOKEN_KEY) && !error.config?.url?.includes("/auth/")) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

/** Pulls the human-readable message out of an axios error. */
export function errorMessage(error, fallback = "Something went wrong") {
  const data = error?.response?.data;
  if (!data) return error?.message || fallback;
  if (data.details) {
    const first = Object.values(data.details)[0];
    if (first) return first;
  }
  return data.error || fallback;
}

export default api;
