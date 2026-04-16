import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ChatWidget from "./components/chat/ChatWidget";
import ScrollToTop from "./components/common/ScrollToTop/ScrollToTop";
import { useTheme } from "./hooks/useTheme";
import AppRoutes from "./routes/AppRoutes";

function App() {
  const { theme } = useTheme();

  return (
    <>
      <AppRoutes />
      <ChatWidget />
      <ScrollToTop />
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme={theme}
      />
    </>
  );
}

export default App;
