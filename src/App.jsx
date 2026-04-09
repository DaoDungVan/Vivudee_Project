import ScrollToTop from "./components/common/ScrollToTop/ScrollToTop";
import AppRoutes from "./routes/AppRoutes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "./hooks/useTheme";

// Component gốc của toàn bộ app.
function App() {
  // Khởi tạo theme ngay khi app mount:
  // - Đọc từ localStorage (nếu user đã chọn trước đó)
  // - Hoặc tự nhận diện theo theme hệ thống (prefers-color-scheme)
  // Hook tự động gắn data-theme="dark/light" lên <html>
  const { theme } = useTheme();

  return (
    <>
      <AppRoutes />
      {/* Cuộn lên đầu trang khi chuyển route */}
      <ScrollToTop />
      {/* Toast notification — theme theo dark/light mode của app */}
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover theme={theme} />
    </>
  );
}

export default App;
