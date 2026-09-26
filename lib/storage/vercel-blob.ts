import { put, get, del, list } from "@vercel/blob";
import { resolveBlobToken } from "@/lib/env";
import type { StorageAdapter } from "./types";

/**
 * Vercelga xos kod — faqat shu faylda. access:"private" bo'lgani uchun
 * blob to'g'ridan-to'g'ri ommaviy URL orqali ochilmaydi, faqat BLOB_READ_WRITE_TOKEN
 * bilan serverdan (/api/files/[id] orqali) o'qiladi (§8.4).
 */
/** Token nomi prefiksli bo'lishi mumkin — SDK faqat BLOB_READ_WRITE_TOKEN ni o'zi o'qiydi. */
function token() {
  return resolveBlobToken()?.value;
}

export const vercelBlobStorage: StorageAdapter = {
  async put(key, data, contentType) {
    await put(key, data, { access: "private", contentType, token: token() });
  },

  async getStream(key) {
    const result = await get(key, { access: "private", token: token() });
    if (!result || result.statusCode !== 200) {
      throw new Error("Fayl topilmadi");
    }
    return result.stream;
  },

  async delete(key) {
    await del(key, { token: token() });
  },

  /** Token yoki OIDC (BLOB_STORE_ID) — qaysi biri bo'lsa ham, SDK o'zi tanlaydi. */
  async check() {
    await list({ limit: 1, token: token() });
  },
};
