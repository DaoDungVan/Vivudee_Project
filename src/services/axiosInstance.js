import axios from "axios";

// Tạo một "instance" axios dùng chung cho toàn bộ app.
// Mục đích: mọi request đều có chung baseURL, không cần gõ lại domain mỗi lần.
// Ví dụ: API.get("/bookings") → gọi tới https://backend.../api/bookings
const API = axios.create({
  baseURL: "https://backend-log-function-2.onrender.com/api",
});

// Interceptor: tự động gắn token vào header TRƯỚC KHI gửi request.
// Tại sao? Vì backend cần biết user là ai (đã đăng nhập chưa).
// Ví dụ: Authorization: Bearer eyJhbGci...
// Nếu không có token (chưa login) thì bỏ qua, không gắn gì cả.
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;
