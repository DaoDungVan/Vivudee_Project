const MAX_ATTACHMENTS_PER_MESSAGE = 4;
const MAX_IMAGE_FILE_SIZE = 2 * 1024 * 1024;
const MAX_FILE_SIZE = 3 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const MAX_ATTACHMENT_DATA_URL_LENGTH = 2_500_000;

export const CHAT_ATTACHMENT_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".zip",
  ".rar",
].join(",");

const createAttachmentId = (prefix = "attachment") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const encodeSvgDataUrl = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const createStickerSvg = (emoji, startColor, endColor) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stop-color="${startColor}" />
        <stop offset="100%" stop-color="${endColor}" />
      </linearGradient>
    </defs>
    <rect x="8" y="8" width="144" height="144" rx="36" fill="url(#g)" />
    <circle cx="116" cy="44" r="18" fill="rgba(255,255,255,0.24)" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="74">${emoji}</text>
  </svg>
`;

const STICKER_DEFINITIONS = [
  { id: "smile", emoji: "\u{1F60A}", label: "Smile" },
  { id: "love", emoji: "\u{1F60D}", label: "Love" },
  { id: "cool", emoji: "\u{1F60E}", label: "Cool" },
  { id: "party", emoji: "\u{1F973}", label: "Party" },
  { id: "wow", emoji: "\u{1F62E}", label: "Wow" },
  { id: "thanks", emoji: "\u{1F64F}", label: "Thanks" },
  { id: "laugh", emoji: "\u{1F602}", label: "Laugh" },
  { id: "kiss", emoji: "\u{1F618}", label: "Kiss" },
  { id: "clap", emoji: "\u{1F44F}", label: "Clap" },
  { id: "ok", emoji: "\u{1F44C}", label: "OK" },
  { id: "thumbs-up", emoji: "\u{1F44D}", label: "Like" },
  { id: "fire", emoji: "\u{1F525}", label: "Fire" },
  { id: "star", emoji: "\u{2B50}", label: "Star" },
  { id: "heart", emoji: "\u{2764}\u{FE0F}", label: "Heart" },
  { id: "thinking", emoji: "\u{1F914}", label: "Thinking" },
  { id: "sad", emoji: "\u{1F614}", label: "Sad" },
  { id: "cry", emoji: "\u{1F62D}", label: "Cry" },
  { id: "angry", emoji: "\u{1F621}", label: "Angry" },
  { id: "sleepy", emoji: "\u{1F62A}", label: "Sleepy" },
  { id: "hello", emoji: "\u{1F44B}", label: "Hello" },
  { id: "pray", emoji: "\u{1F932}", label: "Pray" },
  { id: "celebrate", emoji: "\u{1F389}", label: "Celebrate" },
  { id: "rocket", emoji: "\u{1F680}", label: "Rocket" },
  { id: "call-me", emoji: "\u{1F919}", label: "Call me" },
];

const STICKER_TONES = [
  ["#f59e0b", "#f97316"],
  ["#ec4899", "#f43f5e"],
  ["#3b82f6", "#14b8a6"],
  ["#8b5cf6", "#ec4899"],
  ["#06b6d4", "#3b82f6"],
  ["#22c55e", "#14b8a6"],
  ["#ef4444", "#f97316"],
  ["#a855f7", "#6366f1"],
];

export const STICKER_PRESETS = STICKER_DEFINITIONS.map((item, index) => {
  const [startColor, endColor] = STICKER_TONES[index % STICKER_TONES.length];
  return {
    ...item,
    dataUrl: encodeSvgDataUrl(createStickerSvg(item.emoji, startColor, endColor)),
  };
});

const ensureAttachmentCapacity = (existingCount, incomingCount) => {
  if (existingCount + incomingCount > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new Error(`Chi duoc gui toi da ${MAX_ATTACHMENTS_PER_MESSAGE} tep trong mot tin nhan.`);
  }
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Khong doc duoc tep dinh kem."));
    reader.readAsDataURL(file);
  });

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Khong doc duoc anh dinh kem."));
    };

    image.src = objectUrl;
  });

const optimizeImageFile = async (file) => {
  if (file.type === "image/svg+xml") {
    const rawDataUrl = await readFileAsDataUrl(file);
    if (rawDataUrl.length > MAX_ATTACHMENT_DATA_URL_LENGTH) {
      throw new Error("Anh SVG qua lon. Vui long chon file nho hon.");
    }
    return rawDataUrl;
  }

  const image = await loadImageFromFile(file);
  const longestSide = Math.max(image.width, image.height) || 1;
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / longestSide);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Trinh duyet khong ho tro xu ly anh.");
  }

  context.drawImage(image, 0, 0, width, height);

  const preferredType = file.type === "image/png" ? "image/png" : "image/jpeg";
  let output = canvas.toDataURL(preferredType, 0.88);
  let quality = 0.88;

  while (output.length > MAX_ATTACHMENT_DATA_URL_LENGTH && quality > 0.52) {
    quality -= 0.08;
    output = canvas.toDataURL("image/jpeg", quality);
  }

  if (output.length > MAX_ATTACHMENT_DATA_URL_LENGTH) {
    throw new Error("Anh qua lon sau khi toi uu. Vui long chon anh nho hon.");
  }

  return output;
};

const normalizeAttachmentName = (name, fallback) => {
  const normalized = String(name || "").trim();
  return normalized || fallback;
};

const createImageAttachment = async (file) => {
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error("Anh dinh kem phai nho hon 2MB.");
  }

  const dataUrl = await optimizeImageFile(file);

  return {
    id: createAttachmentId("image"),
    type: "image",
    name: normalizeAttachmentName(file.name, "image.jpg"),
    mime_type: file.type || "image/jpeg",
    size: file.size,
    data_url: dataUrl,
  };
};

const createFileAttachment = async (file) => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File dinh kem phai nho hon 3MB.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  if (dataUrl.length > MAX_ATTACHMENT_DATA_URL_LENGTH) {
    throw new Error("File dinh kem qua lon. Vui long chon file nho hon.");
  }

  return {
    id: createAttachmentId("file"),
    type: "file",
    name: normalizeAttachmentName(file.name, "file"),
    mime_type: file.type || "application/octet-stream",
    size: file.size,
    data_url: dataUrl,
  };
};

export const createAttachmentsFromFiles = async (files, existingCount = 0) => {
  const fileList = Array.from(files || []);
  ensureAttachmentCapacity(existingCount, fileList.length);

  const attachments = [];
  for (const file of fileList) {
    if (String(file.type || "").startsWith("image/")) {
      attachments.push(await createImageAttachment(file));
      continue;
    }

    attachments.push(await createFileAttachment(file));
  }

  return attachments;
};

export const createStickerAttachment = (sticker) => {
  if (!sticker?.dataUrl) {
    throw new Error("Sticker khong hop le.");
  }

  return {
    id: createAttachmentId("sticker"),
    type: "sticker",
    name: `${sticker.id || "sticker"}.svg`,
    mime_type: "image/svg+xml",
    size: sticker.dataUrl.length,
    data_url: sticker.dataUrl,
    sticker_id: sticker.id || null,
    label: sticker.label || "",
  };
};

export const canAddSticker = (existingCount) => {
  ensureAttachmentCapacity(existingCount, 1);
  return true;
};

export const formatAttachmentSize = (value) => {
  const size = Number(value) || 0;
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
};

export const getMessageAttachments = (message) => {
  const attachments = message?.meta?.attachments;
  return Array.isArray(attachments) ? attachments : [];
};

export const getMessageAttachmentSignature = (message) =>
  JSON.stringify(
    getMessageAttachments(message).map((attachment) => [
      attachment?.type || "",
      attachment?.name || "",
      Number(attachment?.size) || 0,
      String(attachment?.data_url || "").slice(0, 48),
    ])
  );
