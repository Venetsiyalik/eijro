import { put, get, del } from "@vercel/blob";
import type { StorageAdapter } from "./types";

/**
 * Vercelga xos kod — faqat shu faylda. access:"private" bo'lgani uchun
 * blob to'g'ridan-to'g'ri ommaviy URL orqali ochilmaydi, faqat BLOB_READ_WRITE_TOKEN
 * bilan serverdan (/api/files/[id] orqali) o'qiladi (§8.4).
 */
export const vercelBlobStorage: StorageAdapter = {
  async put(key, data, contentType) {
    await put(key, data, { access: "private", contentType });
  },

  async getStream(key) {
    const result = await get(key, { access: "private" });
    if (!result || result.statusCode !== 200) {
      throw new Error("Fayl topilmadi");
    }
    return result.stream;
  },

  async delete(key) {
    await del(key);
  },
};
