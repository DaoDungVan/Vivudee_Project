// Key lưu trong localStorage để nhận diện guest qua các lần vào app
const GUEST_SESSION_KEY = "chat_guest_session_id";

// Tạo một ID ngẫu nhiên cho guest
// Ưu tiên dùng crypto.randomUUID() nếu trình duyệt hỗ trợ (chuẩn hơn)
// Fallback về Date.now() + Math.random() nếu không có crypto (trình duyệt cũ)
const generateGuestSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `guest_${crypto.randomUUID().replace(/-/g, "")}`;
  }

  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
};

// Lấy session ID của guest — tạo mới nếu chưa có, dùng lại nếu đã có
// Nhờ lưu vào localStorage, backend vẫn nhận ra cùng một guest dù F5 hay mở lại tab
// try/catch để xử lý trường hợp hiếm: trình duyệt chặn localStorage (chế độ ẩn danh nghiêm ngặt)
export const getGuestSessionId = () => {
  try {
    const existing = localStorage.getItem(GUEST_SESSION_KEY);
    if (existing) {
      return existing;
    }

    const created = generateGuestSessionId();
    localStorage.setItem(GUEST_SESSION_KEY, created);
    return created;
  } catch {
    // Nếu localStorage không dùng được thì tạo ID tạm, không lưu lại
    return generateGuestSessionId();
  }
};

// Tạo config header để gắn vào mỗi request chat
// Header "x-guest-session" giúp backend phân biệt guest này với guest khác
// Dùng cho cả user đăng nhập lẫn guest (backend tự ưu tiên token nếu có)
export const getChatAuthConfig = () => ({
  headers: {
    "x-guest-session": getGuestSessionId(),
  },
});
