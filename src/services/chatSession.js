const GUEST_SESSION_KEY = "chat_guest_session_id";

const generateGuestSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `guest_${crypto.randomUUID().replace(/-/g, "")}`;
  }

  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
};

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
    return generateGuestSessionId();
  }
};

export const getChatAuthConfig = () => ({
  headers: {
    "x-guest-session": getGuestSessionId(),
  },
});
