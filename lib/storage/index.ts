import type { StorageAdapter } from "./types";
import { vercelBlobStorage } from "./vercel-blob";
import { s3Storage } from "./s3";

export function getStorage(): StorageAdapter {
  return process.env.STORAGE_DRIVER === "s3" ? s3Storage : vercelBlobStorage;
}

export type { StorageAdapter } from "./types";
