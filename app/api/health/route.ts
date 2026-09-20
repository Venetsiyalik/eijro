import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const filled = (name: string) => Boolean(process.env[name]?.trim());

/** Deploy holatini tekshirish uchun: qiymatlar ko'rsatilmaydi, faqat bor/yo'qligi va baza ulanishi. */
export async function GET() {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

  const env = {
    DATABASE_URL: filled("DATABASE_URL"),
    DATABASE_URL_looksValid: /^postgres(ql)?:\/\//.test(databaseUrl),
    DATABASE_URL_usesPooler: databaseUrl.includes("-pooler"),
    DIRECT_URL: filled("DIRECT_URL"),
    AUTH_SECRET: filled("AUTH_SECRET"),
    STORAGE_DRIVER: process.env.STORAGE_DRIVER?.trim() || null,
    BLOB_READ_WRITE_TOKEN: filled("BLOB_READ_WRITE_TOKEN"),
  };

  let database: { ok: boolean; users?: number; error?: string };
  try {
    database = { ok: true, users: await db.user.count() };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : undefined;
    const name = error instanceof Error ? error.name : "UnknownError";
    database = { ok: false, error: code ? `${name} (${code})` : name };
  }

  const ok = env.DATABASE_URL && env.DIRECT_URL && env.AUTH_SECRET && database.ok;
  return NextResponse.json({ ok, env, database }, { status: ok ? 200 : 503 });
}
