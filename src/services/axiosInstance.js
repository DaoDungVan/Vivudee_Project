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
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Thời điểm login gần nhất — để tránh logout ngay sau khi vừa đăng nhập
let lastLoginTime = 0;
export const markJustLoggedIn = () => { lastLoginTime = Date.now(); };

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const publicPaths = ["/login", "/register", "/reset-password", "/auth"];
      const isPublic = publicPaths.some((p) => window.location.pathname.startsWith(p));

      // Bỏ qua nếu đang ở trang public
      if (isPublic) return Promise.reject(error);

      // Bỏ qua nếu vừa mới login xong (trong vòng 3 giây) — tránh race condition
      if (Date.now() - lastLoginTime < 3000) return Promise.reject(error);

      // Bỏ qua nếu không có token (request public bị 401 bình thường)
      if (!localStorage.getItem("token")) return Promise.reject(error);

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("storage"));
      // Dùng replace để không bị browser bfcache giữ state cũ
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

export default API;
