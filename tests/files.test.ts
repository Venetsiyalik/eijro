import { describe, expect, it } from "vitest";
import { buildStorageKey, formatFileSize, isAllowedFile, MAX_FILE_SIZE, sanitizeFileName } from "@/lib/files";

describe("isAllowedFile (§8.4)", () => {
  it("ruxsat etilgan turlar", () => {
    const ok: [string, string][] = [
      ["hisobot.pdf", "application/pdf"],
      ["xat.doc", "application/msword"],
      ["xat.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["jadval.xls", "application/vnd.ms-excel"],
      ["jadval.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ["slayd.ppt", "application/vnd.ms-powerpoint"],
      ["slayd.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
      ["rasm.jpg", "image/jpeg"],
      ["rasm.jpeg", "image/jpeg"],
      ["rasm.png", "image/png"],
      ["arxiv.zip", "application/zip"],
      ["arxiv.zip", "application/x-zip-compressed"],
    ];
    for (const [name, mime] of ok) expect(isAllowedFile(name, mime), name).toBe(true);
  });

  it("noma'lum brauzer mime'i (octet-stream) bo'lsa kengaytma bo'yicha tekshiriladi", () => {
    expect(isAllowedFile("hisobot.pdf", "application/octet-stream")).toBe(true);
    expect(isAllowedFile("virus.exe", "application/octet-stream")).toBe(false);
  });

  it("xavfli/ruxsat etilmagan turlar rad etiladi", () => {
    expect(isAllowedFile("skript.exe", "application/x-msdownload")).toBe(false);
    expect(isAllowedFile("sahifa.html", "text/html")).toBe(false);
    expect(isAllowedFile("kod.js", "text/javascript")).toBe(false);
    expect(isAllowedFile("faylsiz", "application/pdf")).toBe(false);
  });

  it("kengaytma mime'ga mos kelmasa rad etiladi", () => {
    expect(isAllowedFile("soxta.pdf", "image/png")).toBe(false);
    expect(isAllowedFile("soxta.exe", "application/pdf")).toBe(false);
  });

  it("maksimal hajm 20 MB", () => {
    expect(MAX_FILE_SIZE).toBe(20 * 1024 * 1024);
  });
});

describe("sanitizeFileName / buildStorageKey", () => {
  it("yo'l ajratkichlar va xavfli belgilar olib tashlanadi", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\fayllar\\hisobot.pdf")).toBe("hisobot.pdf");
    expect(sanitizeFileName("hisobot 2026 (yakuniy).pdf")).toBe("hisobot_2026__yakuniy_.pdf");
    expect(sanitizeFileName("o'zbek-хат.docx")).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it("bo'sh nom uchun zaxira nom, uzun nom 100 belgigacha qisqartiriladi", () => {
    expect(sanitizeFileName("")).toBe("file");
    const long = sanitizeFileName("a".repeat(300) + ".pdf");
    expect(long.length).toBeLessThanOrEqual(100);
    expect(long.endsWith(".pdf")).toBe(true);
  });

  it("storageKey = tasks/{taskId}/{id}-{safeName} va har safar noyob", () => {
    const a = buildStorageKey("task123", "Hisobot 1.pdf");
    const b = buildStorageKey("task123", "Hisobot 1.pdf");
    expect(a).toMatch(/^tasks\/task123\/[0-9a-f-]{36}-[a-zA-Z0-9._-]+$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain("..");
  });
});

describe("formatFileSize", () => {
  it("B / KB / MB", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
