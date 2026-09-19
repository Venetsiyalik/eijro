export interface StorageAdapter {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  getStream(key: string): Promise<ReadableStream<Uint8Array>>;
  delete(key: string): Promise<void>;
}
