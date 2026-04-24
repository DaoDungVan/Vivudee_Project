import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaCommentDots,
  FaPaperclip,
  FaPaperPlane,
  FaRobot,
  FaSmile,
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
import {
  CHAT_ATTACHMENT_ACCEPT,
  STICKER_PRESETS,
  canAddSticker,
  createAttachmentsFromFiles,
  createStickerAttachment,
  formatAttachmentSize,
  getMessageAttachmentSignature,
  getMessageAttachments,
} from "../../utils/chatAttachments";
import styles from "./ChatWidget.module.css";

const createLocalMessage = (content, senderRole, attachments = []) => ({
  id: `local-${senderRole}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  content,
  sender_role: senderRole,
  created_at: new Date().toISOString(),
  pending: true,
  meta: {
    attachments,
  },
});

const messagesMatch = (left, right) =>
  left?.id === right?.id ||
  (left?.content === right?.content &&
    left?.sender_role === right?.sender_role &&
    getMessageAttachmentSignature(left) === getMessageAttachmentSignature(right));

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

const MESSAGE_COLLAPSE_CHAR_LIMIT = 280;
const MESSAGE_COLLAPSE_LINE_LIMIT = 4;
const MIN_PANEL_WIDTH = 320;
const MIN_PANEL_HEIGHT = 420;
const PANEL_HORIZONTAL_MARGIN = 24;
const PANEL_VERTICAL_MARGIN = 110;

const shouldCollapseMessage = (content) => {
  const text = String(content || "");
  return text.length > MESSAGE_COLLAPSE_CHAR_LIMIT || text.split(/\r?\n/).length > MESSAGE_COLLAPSE_LINE_LIMIT;
};

const isNearBottom = (element, threshold = 80) =>
  element.scrollHeight - element.scrollTop - element.clientHeight < threshold;

function ExpandableMessageText({ content, t }) {
  const [expanded, setExpanded] = useState(false);
  const text = String(content || "");
  const canCollapse = shouldCollapseMessage(text);

  if (!text.trim()) {
    return null;
  }

  return (
    <>
      <p className={`${styles.messageText} ${canCollapse && !expanded ? styles.messageTextCollapsed : ""}`}>
        {text}
      </p>
      {canCollapse && (
        <button
          type="button"
          className={styles.messageToggle}
          onClick={() => setExpanded((previous) => !previous)}
        >
          {expanded ? t("chat.showLess") : t("chat.showMore")}
        </button>
      )}
    </>
  );
}

function MessageAttachments({ message, t, onMediaLoad }) {
  const attachments = getMessageAttachments(message);

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={styles.attachmentList}>
      {attachments.map((attachment, index) => {
        const key = attachment.id || `${attachment.type}-${index}`;

        if (attachment.type === "image" || attachment.type === "sticker") {
          return (
            <a
              key={key}
              className={`${styles.imageAttachment} ${
                attachment.type === "sticker" ? styles.stickerAttachment : ""
              }`}
              href={attachment.data_url}
              download={attachment.name || undefined}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={attachment.data_url}
                alt={
                  attachment.label ||
                  attachment.name ||
                  t("chat.attachmentImage", { defaultValue: "Anh dinh kem" })
                }
                onLoad={onMediaLoad}
              />
            </a>
          );
        }

        return (
          <a
            key={key}
            className={styles.fileAttachment}
            href={attachment.data_url}
            download={attachment.name || undefined}
            target="_blank"
            rel="noreferrer"
          >
            <div className={styles.fileAttachmentTitle}>
              {attachment.name || t("chat.attachmentFile", { defaultValue: "File dinh kem" })}
            </div>
            <div className={styles.fileAttachmentMeta}>
              <span>{attachment.mime_type || t("chat.attachmentFile", { defaultValue: "File dinh kem" })}</span>
              <span>{formatAttachmentSize(attachment.size)}</span>
            </div>
            <span className={styles.fileAttachmentLink}>
              {t("chat.downloadFile", { defaultValue: "Tai file" })}
            </span>
          </a>
        );
      })}
    </div>
  );
}

function AttachmentPreviewList({ attachments, onRemove, t }) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div className={styles.composerPreviewList}>
      {attachments.map((attachment) => (
        <div key={attachment.id} className={styles.composerPreviewItem}>
          {attachment.type === "image" || attachment.type === "sticker" ? (
            <img
              className={`${styles.composerPreviewThumb} ${
                attachment.type === "sticker" ? styles.composerPreviewSticker : ""
              }`}
              src={attachment.data_url}
              alt={
                attachment.label ||
                attachment.name ||
                t("chat.attachmentImage", { defaultValue: "Anh dinh kem" })
              }
            />
          ) : (
            <div className={styles.composerPreviewFile}>{attachment.name?.slice(0, 2).toUpperCase() || "FI"}</div>
          )}
          <div className={styles.composerPreviewMeta}>
            <strong>{attachment.label || attachment.name}</strong>
            <span>{attachment.type === "file" ? formatAttachmentSize(attachment.size) : attachment.type}</span>
          </div>
          <button
            type="button"
            className={styles.composerPreviewRemove}
            onClick={() => onRemove(attachment.id)}
            aria-label={t("chat.removeAttachment", { defaultValue: "Xoa dinh kem" })}
          >
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
}

function ChatWidget() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("ai");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: null, height: null });
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 640 : false
  );
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
  const panelRef = useRef(null);
  const fileInputRef = useRef(null);
  const suppressSocketRefreshRef = useRef({ ai: 0, support: 0 });
  const audioContextRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const pendingScrollToLatestRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const resizeStateRef = useRef(null);
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
    const handleViewportResize = () => {
      const compact = window.innerWidth <= 640;
      setIsCompactViewport(compact);
      if (compact) {
        setPanelSize((previous) => (previous.width || previous.height ? { width: null, height: null } : previous));
      } else {
        setPanelSize((previous) => {
          if (!previous.width && !previous.height) {
            return previous;
          }

          const maxWidth = Math.max(MIN_PANEL_WIDTH, window.innerWidth - PANEL_HORIZONTAL_MARGIN);
          const maxHeight = Math.max(MIN_PANEL_HEIGHT, window.innerHeight - PANEL_VERTICAL_MARGIN);
          return {
            width: Math.min(previous.width || maxWidth, maxWidth),
            height: Math.min(previous.height || maxHeight, maxHeight),
          };
        });
      }
    };

    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
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
    setMode("ai");
    setDraft("");
    setAttachments([]);
    setIsStickerPickerOpen(false);
    setShowJumpToLatest(false);
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

  useEffect(() => {
    if (mode !== "support" && attachments.length > 0) {
      setAttachments([]);
    }
    if (mode !== "support") {
      setIsStickerPickerOpen(false);
    }
  }, [attachments.length, mode]);

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
  const sendDisabled = (!draft.trim() && attachments.length === 0) || sending;

  const supportStatusLabel =
    t(`chat.subSupport_${supportStatus}`, "") || t("chat.subSupport_open");
  const displayedQuickReplies = aiState.quickReplies.length > 0 ? aiState.quickReplies : defaultPrompts;

  const scrollMessagesToBottom = useCallback((behavior = "smooth") => {
    const element = messagesRef.current;
    if (!element) {
      return;
    }

    if (typeof element.scrollTo === "function") {
      element.scrollTo({ top: element.scrollHeight, behavior });
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const element = messagesRef.current;
    if (!element) {
      return;
    }

    const nearBottom = isNearBottom(element, 90);
    shouldStickToBottomRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom && currentMessages.length > 0);
  }, [currentMessages.length]);

  const stopResize = useCallback(() => {
    if (!resizeStateRef.current) {
      return;
    }

    window.removeEventListener("pointermove", resizeStateRef.current.handleMove);
    window.removeEventListener("pointerup", resizeStateRef.current.handleUp);
    window.removeEventListener("pointercancel", resizeStateRef.current.handleUp);
    document.body.style.userSelect = "";
    resizeStateRef.current = null;
  }, []);

  const handleResizePointerDown = useCallback((event) => {
    if (event.button !== 0 || isCompactViewport) {
      return;
    }

    const panelElement = panelRef.current;
    if (!panelElement) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const startState = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: panelElement.offsetWidth,
      startHeight: panelElement.offsetHeight,
    };

    const handleMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startState.startX;
      const deltaY = moveEvent.clientY - startState.startY;
      const maxWidth = Math.max(MIN_PANEL_WIDTH, window.innerWidth - PANEL_HORIZONTAL_MARGIN);
      const maxHeight = Math.max(MIN_PANEL_HEIGHT, window.innerHeight - PANEL_VERTICAL_MARGIN);

      setPanelSize({
        width: Math.min(maxWidth, Math.max(MIN_PANEL_WIDTH, startState.startWidth - deltaX)),
        height: Math.min(maxHeight, Math.max(MIN_PANEL_HEIGHT, startState.startHeight - deltaY)),
      });
    };

    const handleUp = () => {
      stopResize();
    };

    resizeStateRef.current = { handleMove, handleUp };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  }, [isCompactViewport, stopResize]);

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
  }, [applyConversationData, t]);

  useEffect(() => {
    pendingScrollToLatestRef.current = true;
    shouldStickToBottomRef.current = true;
    setShowJumpToLatest(false);
  }, [isOpen, mode]);

  useEffect(() => {
    const element = messagesRef.current;
    if (!element) {
      return;
    }

    if (pendingScrollToLatestRef.current || shouldStickToBottomRef.current) {
      scrollMessagesToBottom(pendingScrollToLatestRef.current ? "auto" : "smooth");
      pendingScrollToLatestRef.current = false;
      shouldStickToBottomRef.current = true;
      setShowJumpToLatest(false);
      return;
    }

    setShowJumpToLatest(!isNearBottom(element, 90) && currentMessages.length > 0);
  }, [currentMessages, isOpen, mode, scrollMessagesToBottom]);

  useEffect(() => () => {
    stopResize();
  }, [stopResize]);

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
    setIsStickerPickerOpen(false);
    setError("");
    pendingScrollToLatestRef.current = true;
    shouldStickToBottomRef.current = true;
    setShowJumpToLatest(false);

    const hasLoadedSupport =
      stateRef.current.supportState.conversation || stateRef.current.supportState.messages.length > 0;
    if (!hasLoadedSupport) {
      loadConversation("support");
    }
  }, [loadConversation]);

  const handleAttachmentFileChange = async (event) => {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }

    try {
      const nextAttachments = await createAttachmentsFromFiles(files, attachments.length);
      setAttachments((previous) => [...previous, ...nextAttachments]);
      setError("");
    } catch (attachmentError) {
      setError(attachmentError?.message || t("chat.errSend"));
    } finally {
      event.target.value = "";
    }
  };

  const handleAddSticker = (sticker) => {
    try {
      canAddSticker(attachments.length);
      const stickerAttachment = createStickerAttachment(sticker);
      setAttachments((previous) => [...previous, stickerAttachment]);
      setIsStickerPickerOpen(false);
      setError("");
    } catch (attachmentError) {
      setError(attachmentError?.message || t("chat.errSend"));
    }
  };

  const handleRemoveAttachment = (attachmentId) => {
    setAttachments((previous) => previous.filter((attachment) => attachment.id !== attachmentId));
  };

  const handleSend = async () => {
    const message = draft.trim();
    const outgoingAttachments = attachments;

    if ((!message && outgoingAttachments.length === 0) || sending) {
      return;
    }

    const channel = mode;
    if (channel !== "support" && outgoingAttachments.length > 0) {
      setError(
        t("chat.attachmentsOnlySupport", {
          defaultValue: "Sticker, anh va file hien chi ho tro o khung chat voi admin.",
        })
      );
      return;
    }

    const optimisticMessage = createLocalMessage(message, "user", outgoingAttachments);
    suppressSocketRefreshRef.current[channel] += 1;
    pendingScrollToLatestRef.current = true;
    shouldStickToBottomRef.current = true;
    setShowJumpToLatest(false);

    updateConversationState(channel, (previousState) => ({
      ...previousState,
      messages: [...previousState.messages, optimisticMessage],
    }));

    setDraft("");
    setAttachments([]);
    setIsStickerPickerOpen(false);
    setSending(true);
    setError("");

    try {
      const response =
        channel === "support"
          ? await sendSupportMessage({ message, attachments: outgoingAttachments })
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
      setAttachments(outgoingAttachments);
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

  const handleMediaLoad = useCallback(() => {
    const element = messagesRef.current;
    if (!element) {
      return;
    }

    if (shouldStickToBottomRef.current || isNearBottom(element, 120)) {
      shouldStickToBottomRef.current = true;
      setShowJumpToLatest(false);
      scrollMessagesToBottom("auto");
    }
  }, [scrollMessagesToBottom]);

  return (
    <div className={styles.root}>
      {isOpen && (
        <section
          ref={panelRef}
          className={styles.panel}
          style={
            !isCompactViewport && (panelSize.width || panelSize.height)
              ? {
                  width: panelSize.width || undefined,
                  height: panelSize.height || undefined,
                }
              : undefined
          }
        >
          {!isCompactViewport && (
            <button
              type="button"
              className={styles.resizeHandle}
              onPointerDown={handleResizePointerDown}
              aria-label={t("chat.resizeFromTopLeft", { defaultValue: "Keo de thay doi kich thuoc chat" })}
            >
              <span />
              <span />
              <span />
            </button>
          )}
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
              <button
                type="button"
                className={styles.backToAiBtn}
                onClick={() => {
                  setMode("ai");
                  setUnread((previous) => ({ ...previous, ai: 0 }));
                  setIsStickerPickerOpen(false);
                  setError("");
                }}
              >
                <FaRobot />
                <span>{t("chat.switchToAi")}</span>
                {unread.ai > 0 && <em>{unread.ai}</em>}
              </button>
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

          <div className={styles.messageArea}>
            <div className={styles.messages} ref={messagesRef} onScroll={handleMessagesScroll}>
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
                        <MessageAttachments message={message} t={t} onMediaLoad={handleMediaLoad} />
                        <ExpandableMessageText content={message.content} t={t} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {showJumpToLatest && (
              <button
                type="button"
                className={styles.jumpToLatestButton}
                onClick={() => {
                  shouldStickToBottomRef.current = true;
                  pendingScrollToLatestRef.current = false;
                  setShowJumpToLatest(false);
                  scrollMessagesToBottom();
                }}
              >
                {t("chat.jumpToLatest", { defaultValue: "Go back" })}
              </button>
            )}
          </div>

          <div className={styles.composer}>
            <div className={styles.composerMain}>
              {mode === "support" && (
                <>
                  <AttachmentPreviewList
                    attachments={attachments}
                    onRemove={handleRemoveAttachment}
                    t={t}
                  />

                  <div className={styles.composerTools}>
                    <button
                      type="button"
                      className={styles.toolButton}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FaPaperclip />
                      <span>{t("chat.attachFiles", { defaultValue: "Anh / file" })}</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.toolButton} ${isStickerPickerOpen ? styles.toolButtonActive : ""}`}
                      onClick={() => setIsStickerPickerOpen((previous) => !previous)}
                    >
                      <FaSmile />
                      <span>{t("chat.stickers", { defaultValue: "Sticker" })}</span>
                    </button>
                  </div>

                  {isStickerPickerOpen && (
                    <div className={styles.stickerPicker}>
                      {STICKER_PRESETS.map((sticker) => (
                        <button
                          key={sticker.id}
                          type="button"
                          className={styles.stickerButton}
                          onClick={() => handleAddSticker(sticker)}
                          title={sticker.label}
                        >
                          <img src={sticker.dataUrl} alt={sticker.label} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              <textarea
                value={draft}
                rows={1}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={currentPlaceholder}
              />

              <input
                ref={fileInputRef}
                className={styles.hiddenInput}
                type="file"
                accept={CHAT_ATTACHMENT_ACCEPT}
                multiple
                onChange={handleAttachmentFileChange}
              />
            </div>

            <button
              type="button"
              className={styles.sendButton}
              onClick={handleSend}
              disabled={sendDisabled}
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
