import API from "./axiosInstance";

export const getAiConversation = () => API.get("/chat/ai");
export const sendAiMessage = (data) => API.post("/chat/ai/message", data);

export const getSupportConversation = () => API.get("/chat/support");
export const sendSupportMessage = (data) => API.post("/chat/support/message", data);
