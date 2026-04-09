import { useEffect, useState } from "react";

// Xác định theme ban đầu:
// 1. Nếu user đã chọn thủ công → dùng từ localStorage
// 2. Nếu chưa chọn → tự nhận diện theo màu hệ điều hành / trình duyệt
const getInitialTheme = () => {
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  // Áp dụng theme lên <html data-theme="..."> và lưu vào localStorage mỗi khi thay đổi
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Lắng nghe khi user đổi theme hệ thống (ví dụ: bật Dark Mode trên Windows/macOS)
  // Chỉ áp dụng nếu user CHƯA chọn thủ công (localStorage trống)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      if (!localStorage.getItem("theme")) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };
}
