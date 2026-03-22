import axios from "axios";

const API = axios.create({
  baseURL: "https://backend-log-function-2.onrender.com/api",
});

// 🔥 AUTO GẮN TOKEN
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;