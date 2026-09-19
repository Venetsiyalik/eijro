import { randomUUID } from "crypto";

/** §8.4: ruxsat etilgan turlar va maksimal hajm. */
const ALLOWED_EXTENSIONS_BY_MIME: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "application/zip": ["zip"],
  "application/x-zip-compressed": ["zip"],
  "application/octet-stream": [], // ba'zi brauzerlar noaniq mime yuboradi — kengaytma bo'yicha tekshiriladi
};

const ALL_ALLOWED_EXTENSIONS = new Set(
  Object.values(ALLOWED_EXTENSIONS_BY_MIME).flat().concat(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "jpg", "jpeg", "png", "zip"])
);

export const MAX_FILE_SIZE = 20 * 1024 * 1024;

function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isAllowedFile(fileName: string, mimeType: string): boolean {
  const ext = getExtension(fileName);
  if (!ext || !ALL_ALLOWED_EXTENSIONS.has(ext)) return false;

  const allowedForMime = ALLOWED_EXTENSIONS_BY_MIME[mimeType];
  if (allowedForMime === undefined) return false; // butunlay noma'lum mime turi
  if (allowedForMime.length === 0) return true; // octet-stream — faqat kengaytma bo'yicha
  return allowedForMime.includes(ext);
}

/** Fayl nomini xavfsizlantiradi: yo'l ajratkichlar va xavfli belgilar olib tashlanadi. */
export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() || "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.slice(-100) || "file";
}

/** §8.4: storageKey = tasks/{taskId}/{cuid}-{safeName} */
export function buildStorageKey(taskId: string, fileName: string): string {
  return `tasks/${taskId}/${randomUUID()}-${sanitizeFileName(fileName)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
