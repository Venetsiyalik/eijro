export interface StorageAdapter {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  getStream(key: string): Promise<ReadableStream<Uint8Array>>;
  delete(key: string): Promise<void>;
  /** Ulanish va ruxsatni tekshirish (faqat o'qish, hech narsa yozmaydi) — /api/health uchun. */
  check(): Promise<void>;
}
