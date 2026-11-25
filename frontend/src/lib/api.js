import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 10000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error?.message;
    if (message && !error.response.data.message) {
      error.response.data.message = message;
    }
    return Promise.reject(error);
  },
);

export const isNetworkError = (error) => !error?.response;

export default api;
