import API from "./axiosInstance";
import { getChatAuthConfig } from "./chatSession";

// Đảm bảo value luôn là mảng — tránh lỗi khi backend trả về null hoặc undefined
const asArray = (value) => (Array.isArray(value) ? value : []);

// Kiểm tra một giá trị có phải object thật không (loại trừ null và mảng)
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Backend chat có thể bọc dữ liệu ở nhiều tầng khác nhau:
// { data: { messages: [...] } } hoặc { result: { messages: [...] } } hoặc { messages: [...] }
// Hàm này tự tìm tầng nào chứa dữ liệu thật (có messages, conversation, quick_replies...)
const unwrapPayload = (payload) => {
  if (!isObject(payload)) {
    return {};
  }

  // Thử lần lượt các tầng bọc phổ biến
  const candidates = [payload, payload.data, payload.result, payload.payload].filter(isObject);

  const matched =
    candidates.find((item) =>
      Array.isArray(item.messages) ||
      isObject(item.conversation) ||
      Array.isArray(item.quick_replies) ||
      Array.isArray(item.quickReplies) ||
      item.should_contact_admin !== undefined ||
      item.shouldContactAdmin !== undefined
    ) || candidates[0]; // Nếu không khớp cái nào thì lấy tầng đầu tiên

  return matched || {};
};

// Tạo ID tạm cho tin nhắn khi backend không trả về id
// Dùng cho optimistic message (tin nhắn hiện tạm trước khi server xác nhận)
const createFallbackId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Chuẩn hóa một tin nhắn về cấu trúc thống nhất
// Backend AI và backend support có thể trả về tên field khác nhau:
//   content / message / text / reply / response → đều map về "content"
//   sender_role / role / senderType / type       → đều map về "sender_role"
//   created_at / createdAt / timestamp           → đều map về "created_at"
// Trả về null nếu tin nhắn rỗng hoặc không hợp lệ (sẽ bị filter ra sau)
const normalizeMessage = (message, fallbackRole = "assistant") => {
  // Nếu backend trả về chuỗi thô thay vì object
  if (typeof message === "string") {
    return {
      id: createFallbackId("text"),
      content: message,
      sender_role: fallbackRole,
      sender_name: fallbackRole === "user" ? "Ban" : "Vivudee AI",
      created_at: new Date().toISOString(),
    };
  }

  if (!isObject(message)) {
    return null;
  }

  // Lấy role từ nhiều tên field khác nhau tùy backend
  const role =
    message.sender_role ||
    message.role ||
    message.senderType ||
    message.type ||
    fallbackRole;

  // Lấy nội dung từ nhiều tên field khác nhau tùy backend
  const content =
    message.content ??
    message.message ??
    message.text ??
    message.reply ??
    message.response ??
    "";

  // Bỏ qua tin nhắn không có nội dung
  if (!String(content || "").trim()) {
    return null;
  }

  return {
    ...message,
    id: message.id || message._id || message.message_id || createFallbackId(role),
    content,
    sender_role: role,
    sender_name:
      message.sender_name ||
      message.senderName ||
      message.name ||
      (role === "user" ? "Ban" : role === "assistant" ? "Vivudee AI" : "Admin"),
    created_at:
      message.created_at ||
      message.createdAt ||
      message.timestamp ||
      new Date().toISOString(),
  };
};

// Chuẩn hóa toàn bộ response từ API chat về một cấu trúc dùng chung
// Dù backend AI hay support trả về format khác nhau,
// ChatWidget chỉ cần làm việc với { conversation, messages, quickReplies, shouldContactAdmin }
export const normalizeChatPayload = (payload) => {
  const data = unwrapPayload(payload);

  // Tìm nguồn tin nhắn — thử lần lượt data.messages → data.conversation.messages → data.items
  const messagesSource =
    asArray(data.messages).length > 0
      ? data.messages
      : asArray(data.conversation?.messages).length > 0
        ? data.conversation.messages
        : asArray(data.items).length > 0
          ? data.items
          : [];

  const normalizedMessages = messagesSource.map((item) => normalizeMessage(item)).filter(Boolean);

  // Một số API trả về tin nhắn mới nhất của assistant ở field riêng thay vì trong mảng messages
  const fallbackAssistant =
    normalizeMessage(data.assistant_message, "assistant") ||
    normalizeMessage(data.reply, "assistant") ||
    normalizeMessage(data.response, "assistant");

  return {
    conversation: isObject(data.conversation) ? data.conversation : null,
    // Nếu không có messages nào thì thử dùng fallback assistant message
    messages: normalizedMessages.length > 0 ? normalizedMessages : fallbackAssistant ? [fallbackAssistant] : [],
    quickReplies:
      asArray(data.quick_replies).length > 0 ? data.quick_replies : asArray(data.quickReplies),
    // shouldContactAdmin = true khi AI nhận ra câu hỏi vượt ngoài khả năng → tự chuyển sang admin
    shouldContactAdmin: Boolean(
      data.should_contact_admin ??
        data.shouldContactAdmin ??
        data.escalate_to_admin ??
        data.escalateToAdmin
    ),
  };
};

// Lấy toàn bộ lịch sử hội thoại với AI
export const getAiConversation = () => API.get("/chat/ai", getChatAuthConfig());

// Gửi tin nhắn mới đến AI
export const sendAiMessage = (data) => API.post("/chat/ai/message", data, getChatAuthConfig());

// Lấy toàn bộ lịch sử hội thoại với admin support
export const getSupportConversation = () => API.get("/chat/support", getChatAuthConfig());

// Gửi tin nhắn mới đến admin support
export const sendSupportMessage = (data) =>
  API.post("/chat/support/message", data, getChatAuthConfig());
