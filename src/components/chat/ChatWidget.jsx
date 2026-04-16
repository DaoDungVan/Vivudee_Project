import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaCommentDots,
  FaPaperPlane,
  FaRobot,
  FaTimes,
  FaUserTie,
} from "react-icons/fa";
import {
  getAiConversation,
  getSupportConversation,
  normalizeChatPayload,
  sendAiMessage,
  sendSupportMessage,
} from "../../services/chatService";
import { createSocketConnection } from "../../services/socketService";
import styles from "./ChatWidget.module.css";

const createLocalMessage = (content, senderRole) => ({
  id: `local-${senderRole}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  content,
  sender_role: senderRole,
  created_at: new Date().toISOString(),
  pending: true,
});

const messagesMatch = (left, right) =>
  left?.id === right?.id ||
  (left?.content === right?.content && left?.sender_role === right?.sender_role);

const compareMessages = (left, right) => {
  const leftTime = new Date(left.created_at).getTime();
  const rightTime = new Date(right.created_at).getTime();

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return String(left.id).localeCompare(String(right.id));
};

const reconcileMessages = (previousMessages, nextMessages) => {
  const confirmed = Array.isArray(nextMessages) ? [...nextMessages] : [];
  const pendingMessages = Array.isArray(previousMessages)
    ? previousMessages.filter((message) => message?.pending)
    : [];

  pendingMessages.forEach((pendingMessage) => {
    const exists = confirmed.some((message) => messagesMatch(pendingMessage, message));
    if (!exists) {
      confirmed.push(pendingMessage);
    }
  });

  return confirmed.sort(compareMessages);
};

const formatMessageTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

function ChatWidget() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("ai");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState({ ai: false, support: false });
  const [unread, setUnread] = useState({ ai: 0, support: 0 });
  const [aiState, setAiState] = useState({
    conversation: null,
    messages: [],
    quickReplies: [],
  });
  const [supportState, setSupportState] = useState({
    conversation: null,
    messages: [],
  });

  const messagesRef = useRef(null);
  const suppressSocketRefreshRef = useRef({ ai: 0, support: 0 });
  const audioContextRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const stateRef = useRef({
    aiState,
    supportState,
    isOpen,
    mode,
  });

  useEffect(() => {
    stateRef.current = {
      aiState,
      supportState,
      isOpen,
      mode,
    };
  }, [aiState, supportState, isOpen, mode]);

  useEffect(() => {
    const syncAuthState = () => {
      setAuthToken(localStorage.getItem("token"));
      setUser(getStoredUser());
    };

    window.addEventListener("storage", syncAuthState);
    return () => window.removeEventListener("storage", syncAuthState);
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      audioUnlockedRef.current = true;
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    return () => window.removeEventListener("pointerdown", unlockAudio);
  }, []);

  useEffect(() => {
    const openWidget = () => setIsOpen(true);
    window.addEventListener("open-chat-widget", openWidget);
    return () => window.removeEventListener("open-chat-widget", openWidget);
  }, []);

  useEffect(() => {
    if (!messagesRef.current) {
      return;
    }

    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [isOpen, mode, aiState.messages, supportState.messages]);

  useEffect(() => {
    setMode("ai");
    setAiState({
      conversation: null,
      messages: [],
      quickReplies: [],
    });
    setSupportState({
      conversation: null,
      messages: [],
    });
    setUnread({ ai: 0, support: 0 });
    setError("");
  }, [authToken]);

  const playNotificationSound = useCallback(async () => {
    if (!audioUnlockedRef.current) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const audioContext = audioContextRef.current;
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const playNote = (freq, startTime, duration) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.9, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const t0 = audioContext.currentTime;
    playNote(880, t0, 0.14);
    playNote(1320, t0 + 0.15, 0.18);
  }, []);

  const defaultPrompts = [t("chat.prompt1"), t("chat.prompt2"), t("chat.prompt3")];

  const visitorLabel = useMemo(() => {
    if (user?.full_name) {
      return user.full_name;
    }
    if (user?.email) {
      return user.email;
    }
    return t("chat.guest");
  }, [user, t]);

  const currentMessages = mode === "support" ? supportState.messages : aiState.messages;
  const currentLoading = mode === "support" ? loading.support : loading.ai;
  const currentPlaceholder =
    mode === "support" ? t("chat.placeholderSupport") : t("chat.placeholderAi");
  const supportStatus = supportState.conversation?.status || "open";
  const supportUnread = unread.support;
  const totalUnread = unread.ai + unread.support;

  const supportStatusLabel =
    t(`chat.subSupport_${supportStatus}`, "") || t("chat.subSupport_open");
  const displayedQuickReplies = aiState.quickReplies.length > 0 ? aiState.quickReplies : defaultPrompts;

  const updateConversationState = useCallback((tab, updater) => {
    if (tab === "support") {
      setSupportState(updater);
      return;
    }

    setAiState(updater);
  }, []);

  const applyConversationData = useCallback((tab, data, { preservePending = false, notifyIncoming = false } = {}) => {
    const currentState = tab === "support" ? stateRef.current.supportState : stateRef.current.aiState;
    const nextMessages = preservePending
      ? reconcileMessages(currentState.messages, data.messages)
      : data.messages;
    const previousLastMessage = currentState.messages.at(-1);
    const nextLastMessage = nextMessages.at(-1);
    const hasIncomingMessage =
      notifyIncoming &&
      nextLastMessage &&
      nextLastMessage.sender_role !== "user" &&
      (!previousLastMessage || previousLastMessage.id !== nextLastMessage.id);

    updateConversationState(tab, (previousState) => ({
      conversation: data.conversation || previousState.conversation,
      messages: nextMessages,
      ...(tab === "ai"
        ? {
            quickReplies: data.quickReplies?.length ? data.quickReplies : previousState.quickReplies,
          }
        : {}),
    }));

    if (hasIncomingMessage) {
      const widgetVisible = stateRef.current.isOpen && stateRef.current.mode === tab;
      if (!widgetVisible) {
        setUnread((previous) => ({
          ...previous,
          [tab]: previous[tab] + 1,
        }));
      }
      playNotificationSound();
    }
  }, [playNotificationSound, updateConversationState]);

  const loadConversation = useCallback(async (
    tab,
    { silent = false, notifyIncoming = false, preservePending = false } = {}
  ) => {
    if (!silent) {
      setLoading((previous) => ({ ...previous, [tab]: true }));
    }

    try {
      const response = tab === "support" ? await getSupportConversation() : await getAiConversation();
      const data = normalizeChatPayload(response.data);

      applyConversationData(tab, data, {
        preservePending,
        notifyIncoming,
      });

      if (!silent) {
        setError("");
      }
    } catch (requestError) {
      if (!silent) {
        setError(
          requestError?.response?.data?.message ||
            requestError?.response?.data?.error ||
            requestError?.message ||
            t("chat.errLoad")
        );
      }
    } finally {
      if (!silent) {
        setLoading((previous) => ({ ...previous, [tab]: false }));
      }
    }
  }, [applyConversationData]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode === "support") {
      const hasLoadedSupport =
        stateRef.current.supportState.conversation || stateRef.current.supportState.messages.length > 0;
      if (!hasLoadedSupport) {
        loadConversation("support");
      }
      setUnread((previous) => ({ ...previous, support: 0 }));
      return;
    }

    const hasLoadedAi = stateRef.current.aiState.conversation || stateRef.current.aiState.messages.length > 0;
    if (!hasLoadedAi) {
      loadConversation("ai");
    }
    setUnread((previous) => ({ ...previous, ai: 0 }));
  }, [isOpen, loadConversation, mode]);

  useEffect(() => {
    const socket = createSocketConnection(authToken);

    const handleSocketRefresh = (tab) => {
      if (suppressSocketRefreshRef.current[tab] > 0) {
        suppressSocketRefreshRef.current[tab] -= 1;
        return;
      }

      loadConversation(tab, {
        silent: true,
        notifyIncoming: true,
        preservePending: true,
      });
    };

    const handleAiUpdated = () => handleSocketRefresh("ai");
    const handleSupportUpdated = () => handleSocketRefresh("support");

    socket.on("chat:ai_updated", handleAiUpdated);
    socket.on("chat:support_updated", handleSupportUpdated);

    return () => {
      socket.off("chat:ai_updated", handleAiUpdated);
      socket.off("chat:support_updated", handleSupportUpdated);
      socket.disconnect();
    };
  }, [authToken, loadConversation]);

  const openAdminChat = useCallback(() => {
    setMode("support");
    setUnread((previous) => ({ ...previous, support: 0 }));
    setError("");

    const hasLoadedSupport =
      stateRef.current.supportState.conversation || stateRef.current.supportState.messages.length > 0;
    if (!hasLoadedSupport) {
      loadConversation("support");
    }
  }, [loadConversation]);

  const handleSend = async () => {
    const message = draft.trim();
    if (!message || sending) {
      return;
    }

    const channel = mode;
    const optimisticMessage = createLocalMessage(message, "user");
    suppressSocketRefreshRef.current[channel] += 1;

    updateConversationState(channel, (previousState) => ({
      ...previousState,
      messages: [...previousState.messages, optimisticMessage],
    }));

    setDraft("");
    setSending(true);
    setError("");

    try {
      const response =
        channel === "support"
          ? await sendSupportMessage({ message })
          : await sendAiMessage({ message });
      const data = normalizeChatPayload(response.data);

      updateConversationState(channel, (previousState) => ({
        conversation: data.conversation || previousState.conversation,
        messages: reconcileMessages(
          previousState.messages.filter((item) => item.id !== optimisticMessage.id),
          data.messages
        ),
        ...(channel === "ai"
          ? {
              quickReplies: data.quickReplies?.length ? data.quickReplies : previousState.quickReplies,
            }
          : {}),
      }));

      if (channel === "ai" && data.shouldContactAdmin) {
        openAdminChat();
      }

    } catch (requestError) {
      suppressSocketRefreshRef.current[channel] = Math.max(
        0,
        suppressSocketRefreshRef.current[channel] - 1
      );
      await loadConversation(channel, {
        silent: true,
        preservePending: false,
      });
      setDraft(message);
      setError(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          t("chat.errSend")
      );
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.root}>
      {isOpen && (
        <section className={styles.panel}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={`${styles.headerAvatar} ${mode === "support" ? styles.headerAvatarAdmin : styles.headerAvatarAi}`}>
                {mode === "support" ? <FaUserTie /> : <FaRobot />}
              </div>
              <div className={styles.headerText}>
                <p className={styles.kicker}>Vivudee Chat</p>
                <strong>{mode === "support" ? t("chat.headerSupport") : t("chat.headerAi")}</strong>
                <span>
                  {mode === "support" ? (
                    <><span className={styles.statusDot} />{supportStatusLabel}</>
                  ) : (
                    t("chat.subAi", { name: visitorLabel })
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label={t("chat.closeChat")}
            >
              <FaTimes />
            </button>
          </header>

          <div className={styles.actionBar}>
            {mode === "ai" ? (
              <button type="button" className={styles.toAdminBtn} onClick={openAdminChat}>
                <FaUserTie />
                <span>{t("chat.switchToAdmin")}</span>
                {supportUnread > 0 && <em>{supportUnread}</em>}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.backToAiBtn}
                  onClick={() => {
                    setMode("ai");
                    setUnread((previous) => ({ ...previous, ai: 0 }));
                    setError("");
                  }}
                >
                  <FaRobot />
                  <span>{t("chat.switchToAi")}</span>
                  {unread.ai > 0 && <em>{unread.ai}</em>}
                </button>
              </>
            )}
          </div>

          {mode === "ai" && displayedQuickReplies.length > 0 && (
            <div className={styles.quickReplies}>
              {displayedQuickReplies.map((item) => (
                <button key={item} type="button" onClick={() => setDraft(item)}>
                  {item}
                </button>
              ))}
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.messages} ref={messagesRef}>
            {currentLoading ? (
              <div className={styles.stateBox}>{t("chat.loadingMessages")}</div>
            ) : currentMessages.length === 0 ? (
              <div className={styles.stateBox}>
                <div className={styles.emptyIcon}>
                  {mode === "support" ? <FaUserTie /> : <FaRobot />}
                </div>
                <strong>
                  {mode === "support" ? t("chat.emptySupportTitle") : t("chat.emptyAiTitle")}
                </strong>
                <p>
                  {mode === "support" ? t("chat.emptySupportDesc") : t("chat.emptyAiDesc")}
                </p>
              </div>
            ) : (
              currentMessages.map((message) => {
                const isMine = message.sender_role === "user";
                const isAssistant = message.sender_role === "assistant";
                const senderName =
                  isMine
                    ? t("chat.senderYou")
                    : isAssistant
                    ? t("chat.senderAi")
                    : message.sender_name || t("chat.senderAdmin");

                return (
                  <div
                    key={message.id}
                    className={`${styles.messageRow} ${isMine ? styles.messageMine : ""}`}
                  >
                    <div
                      className={`${styles.messageBubble} ${
                        isMine ? styles.bubbleMine : isAssistant ? styles.bubbleAi : styles.bubbleAdmin
                      } ${message.pending ? styles.bubblePending : ""}`}
                    >
                      <div className={styles.messageMeta}>
                        <span>{senderName}</span>
                        <span>{formatMessageTime(message.created_at)}</span>
                      </div>
                      <p>{message.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.composer}>
            <textarea
              value={draft}
              rows={1}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={currentPlaceholder}
            />
            <button
              type="button"
              className={styles.sendButton}
              onClick={handleSend}
              disabled={!draft.trim() || sending}
            >
              <FaPaperPlane />
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        className={`${styles.fab} ${totalUnread > 0 ? styles.fabPulse : ""}`}
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? t("chat.closeChat") : t("chat.openChat")}
      >
        <FaCommentDots />
        {totalUnread > 0 && <span>{totalUnread}</span>}
      </button>
    </div>
  );
}

export default ChatWidget;
