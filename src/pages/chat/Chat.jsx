import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaCommentDots, FaPaperPlane, FaRobot, FaUserTie } from "react-icons/fa";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import {
  getAiConversation,
  getSupportConversation,
  sendAiMessage,
  sendSupportMessage,
} from "../../services/chatService";
import { createSocketConnection } from "../../services/socketService";
import styles from "./Chat.module.css";

const DEFAULT_AI_PROMPTS = [
  "Tôi muốn hỏi về hoàn vé",
  "Cách đổi ngày bay như thế nào?",
  "Kiểm tra hành lý xách tay giúp tôi",
];

const SUPPORT_STATUS_LABELS = {
  open: "Sẵn sàng hỗ trợ",
  pending_admin: "Đang chờ admin phản hồi",
  pending_user: "Admin đã phản hồi",
  resolved: "Đã xử lý xong",
};

function Chat() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "support" ? "support" : "ai";

  const [aiState, setAiState] = useState({ conversation: null, messages: [], quickReplies: DEFAULT_AI_PROMPTS });
  const [supportState, setSupportState] = useState({ conversation: null, messages: [] });
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState({ ai: true, support: false });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesRef = useRef(null);

  const setActiveTab = (tab) => {
    setSearchParams(tab === "support" ? { tab: "support" } : { tab: "ai" });
    setError("");
    setDraft("");
  };

  const loadAi = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading((prev) => ({ ...prev, ai: true }));
    }

    try {
      const res = await getAiConversation();
      setAiState((prev) => ({
        conversation: res.data?.data?.conversation || null,
        messages: res.data?.data?.messages || [],
        quickReplies: prev.quickReplies,
      }));
      if (!silent) {
        setError("");
      }
    } catch (err) {
      if (!silent) {
        setError(err?.response?.data?.error || "Không tải được hội thoại AI");
      }
    } finally {
      if (!silent) {
        setLoading((prev) => ({ ...prev, ai: false }));
      }
    }
  };

  const loadSupport = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading((prev) => ({ ...prev, support: true }));
    }

    try {
      const res = await getSupportConversation();
      setSupportState({
        conversation: res.data?.data?.conversation || null,
        messages: res.data?.data?.messages || [],
      });
      if (!silent) {
        setError("");
      }
    } catch (err) {
      if (!silent) {
        setError(err?.response?.data?.error || "Không tải được hội thoại với admin");
      }
    } finally {
      if (!silent) {
        setLoading((prev) => ({ ...prev, support: false }));
      }
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    loadAi();
    if (activeTab === "support") {
      loadSupport();
    }
  }, [navigate, activeTab]);

  useEffect(() => {
    if (activeTab === "support") {
      loadSupport();
    }
  }, [activeTab]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return undefined;
    }

    const socket = createSocketConnection(token);

    const handleAiUpdated = () => {
      loadAi({ silent: true });
    };

    const handleSupportUpdated = () => {
      loadSupport({ silent: true });
    };

    socket.on("chat:ai_updated", handleAiUpdated);
    socket.on("chat:support_updated", handleSupportUpdated);

    return () => {
      socket.off("chat:ai_updated", handleAiUpdated);
      socket.off("chat:support_updated", handleSupportUpdated);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!messagesRef.current) {
      return;
    }

    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [activeTab, aiState.messages, supportState.messages]);

  const currentMessages = activeTab === "support" ? supportState.messages : aiState.messages;
  const supportStatus = supportState.conversation?.status || "open";
  const quickReplies = aiState.quickReplies?.length ? aiState.quickReplies : DEFAULT_AI_PROMPTS;

  const handleSend = async () => {
    const message = draft.trim();
    if (!message || sending) {
      return;
    }

    setSending(true);
    setError("");

    try {
      if (activeTab === "support") {
        const res = await sendSupportMessage({ message });
        setSupportState({
          conversation: res.data?.data?.conversation || null,
          messages: res.data?.data?.messages || [],
        });
      } else {
        const res = await sendAiMessage({ message });
        const data = res.data?.data || {};

        setAiState((prev) => ({
          conversation: data.conversation || prev.conversation,
          messages: data.messages || [],
          quickReplies: data.quick_replies?.length ? data.quick_replies : prev.quickReplies,
        }));

        if (data.should_contact_admin) {
          await loadSupport({ silent: true });
        }
      }

      setDraft("");
    } catch (err) {
      setError(err?.response?.data?.error || "Không gửi được tin nhắn");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (message) => {
    const isMine = message.sender_role === "user";
    const isAi = message.sender_role === "assistant";

    return (
      <div
        key={message.id}
        className={`${styles.messageRow} ${isMine ? styles.mine : ""}`}
      >
        <div className={`${styles.messageBubble} ${isAi ? styles.aiBubble : ""}`}>
          <div className={styles.messageMeta}>
            <span>{message.sender_name || (isMine ? "Bạn" : isAi ? "Vivudee AI" : "Admin")}</span>
            <span>{new Date(message.created_at).toLocaleString("vi-VN")}</span>
          </div>
          <p>{message.content}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <NavBar />

      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Support Center</p>
            <h1>Chat với AI hoặc chuyển sang admin khi cần người hỗ trợ thật.</h1>
            <p className={styles.heroText}>
              Tab AI phù hợp với câu hỏi nhanh. Tab Admin dùng cho các trường hợp cần kiểm tra booking, thanh toán hoặc xử lý thủ công.
            </p>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.statCard}>
              <FaRobot />
              <strong>{aiState.messages.length}</strong>
              <span>Tin nhắn AI</span>
            </div>
            <div className={styles.statCard}>
              <FaUserTie />
              <strong>{supportState.messages.length}</strong>
              <span>Tin nhắn admin</span>
            </div>
          </div>
        </section>

        <section className={styles.shell}>
          <aside className={styles.sidebar}>
            <button
              className={`${styles.tabButton} ${activeTab === "ai" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("ai")}
            >
              <FaRobot />
              <div>
                <strong>AI Assistant</strong>
                <span>Hỏi nhanh về vé, hành lý, đổi ngày bay</span>
              </div>
            </button>

            <button
              className={`${styles.tabButton} ${activeTab === "support" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("support")}
            >
              <FaUserTie />
              <div>
                <strong>Chat Với Admin</strong>
                <span>{SUPPORT_STATUS_LABELS[supportStatus] || SUPPORT_STATUS_LABELS.open}</span>
              </div>
            </button>

            {activeTab === "ai" && (
              <div className={styles.quickBox}>
                <p>Gợi ý câu hỏi</p>
                {quickReplies.map((item) => (
                  <button key={item} onClick={() => setDraft(item)}>
                    {item}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "support" && (
              <div className={styles.supportBox}>
                <p>Trạng thái hiện tại</p>
                <strong>{SUPPORT_STATUS_LABELS[supportStatus] || SUPPORT_STATUS_LABELS.open}</strong>
                <span>
                  Admin sẽ thấy cuộc trò chuyện này trong danh sách user bên trái và phản hồi trực tiếp tại đây.
                </span>
              </div>
            )}
          </aside>

          <div className={styles.chatCard}>
            <div className={styles.chatHeader}>
              <div>
                <h2>{activeTab === "ai" ? "AI Chat Box" : "Admin Support"}</h2>
                <p>
                  {activeTab === "ai"
                    ? "AI sẽ trả lời ngay. Nếu câu hỏi cần xử lý thủ công, hệ thống sẽ chuyển tiếp sang admin."
                    : "Đây là hội thoại trực tiếp với admin của hệ thống."}
                </p>
              </div>
              <div className={styles.headerBadge}>
                <FaCommentDots />
                {activeTab === "ai" ? "AI Live" : SUPPORT_STATUS_LABELS[supportStatus] || "Đang hoạt động"}
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {(loading.ai && activeTab === "ai") || (loading.support && activeTab === "support") ? (
              <div className={styles.loading}>Đang tải hội thoại...</div>
            ) : (
              <>
                <div className={styles.messages} ref={messagesRef}>
                  {currentMessages.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>
                        {activeTab === "ai" ? <FaRobot /> : <FaUserTie />}
                      </div>
                      <h3>{activeTab === "ai" ? "Bắt đầu cuộc trò chuyện với AI" : "Mở cuộc trò chuyện với admin"}</h3>
                      <p>
                        {activeTab === "ai"
                          ? "Gửi câu hỏi đầu tiên để AI hỗ trợ tức thì."
                          : "Gửi mô tả vấn đề, admin sẽ trả lời trong cùng khung chat này."}
                      </p>
                    </div>
                  ) : (
                    currentMessages.map(renderMessage)
                  )}
                </div>

                <div className={styles.composer}>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      activeTab === "ai"
                        ? "Nhập câu hỏi cho AI..."
                        : "Nhập nội dung cần admin hỗ trợ..."
                    }
                    rows={3}
                  />
                  <button onClick={handleSend} disabled={sending || !draft.trim()}>
                    <FaPaperPlane />
                    {sending ? "Đang gửi..." : "Gửi"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}

export default Chat;
