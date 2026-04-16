import API from "./axiosInstance";
import { getChatAuthConfig } from "./chatSession";

const asArray = (value) => (Array.isArray(value) ? value : []);

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const unwrapPayload = (payload) => {
  if (!isObject(payload)) {
    return {};
  }

  const candidates = [payload, payload.data, payload.result, payload.payload].filter(isObject);

  const matched =
    candidates.find((item) =>
      Array.isArray(item.messages) ||
      isObject(item.conversation) ||
      Array.isArray(item.quick_replies) ||
      Array.isArray(item.quickReplies) ||
      item.should_contact_admin !== undefined ||
      item.shouldContactAdmin !== undefined
    ) || candidates[0];

  return matched || {};
};

const createFallbackId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeMessage = (message, fallbackRole = "assistant") => {
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

  const role =
    message.sender_role ||
    message.role ||
    message.senderType ||
    message.type ||
    fallbackRole;

  const content =
    message.content ??
    message.message ??
    message.text ??
    message.reply ??
    message.response ??
    "";

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

export const normalizeChatPayload = (payload) => {
  const data = unwrapPayload(payload);

  const messagesSource =
    asArray(data.messages).length > 0
      ? data.messages
      : asArray(data.conversation?.messages).length > 0
        ? data.conversation.messages
        : asArray(data.items).length > 0
          ? data.items
          : [];

  const normalizedMessages = messagesSource.map((item) => normalizeMessage(item)).filter(Boolean);

  const fallbackAssistant =
    normalizeMessage(data.assistant_message, "assistant") ||
    normalizeMessage(data.reply, "assistant") ||
    normalizeMessage(data.response, "assistant");

  return {
    conversation: isObject(data.conversation) ? data.conversation : null,
    messages: normalizedMessages.length > 0 ? normalizedMessages : fallbackAssistant ? [fallbackAssistant] : [],
    quickReplies:
      asArray(data.quick_replies).length > 0 ? data.quick_replies : asArray(data.quickReplies),
    shouldContactAdmin: Boolean(
      data.should_contact_admin ??
        data.shouldContactAdmin ??
        data.escalate_to_admin ??
        data.escalateToAdmin
    ),
  };
};

export const getAiConversation = () => API.get("/chat/ai", getChatAuthConfig());
export const sendAiMessage = (data) => API.post("/chat/ai/message", data, getChatAuthConfig());

export const getSupportConversation = () => API.get("/chat/support", getChatAuthConfig());
export const sendSupportMessage = (data) =>
  API.post("/chat/support/message", data, getChatAuthConfig());
