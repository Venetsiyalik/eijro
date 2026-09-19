import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { StorageAdapter } from "./types";

/** MinIO / S3'ga xos kod — faqat shu faylda (§13: o'z serverga ko'chirishda shu fayl ishlatiladi). */
function getClient(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
  });
}

const BUCKET = process.env.S3_BUCKET || "ijro-files";

export const s3Storage: StorageAdapter = {
  async put(key, data, contentType) {
    const client = getClient();
    await client.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: data, ContentType: contentType })
    );
  },

  async getStream(key) {
    const client = getClient();
    const result = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!result.Body) throw new Error("Fayl topilmadi");
    return result.Body.transformToWebStream();
  },

  async delete(key) {
    const client = getClient();
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  },
};
