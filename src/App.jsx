import ScrollToTop from "./components/common/ScrollToTop/ScrollToTop";
import AppRoutes from "./routes/AppRoutes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Component gốc của toàn bộ app — nơi gắn các thứ dùng chung cho mọi trang.
function App() {
  return (
    <>
      {/* Định nghĩa tất cả các route (trang) của app */}
      <AppRoutes />

      {/* Tự động cuộn lên đầu trang khi chuyển route.
          Tại sao cần? Vì React không reset scroll position khi navigate,
          người dùng có thể đang ở giữa trang A rồi nhảy sang trang B và vẫn thấy giữa trang. */}
      <ScrollToTop />

      {/* Hệ thống thông báo dạng toast (hiện góc phải trên).
          position: hiện ở góc trên bên phải
          autoClose: tự đóng sau 2.5 giây
          Dùng toast.success("...") hoặc toast.error("...") từ bất kỳ component nào */}
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover />
    </>
  );
}

export default App;
