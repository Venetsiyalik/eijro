import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { relevantEnvNames, resolveAuthSecret, resolveBlobToken, resolveDatabaseUrl, resolveDirectUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Deploy holatini tekshirish: qiymatlar ko'rsatilmaydi — faqat nomlar, topilgan-topilmagani va baza ulanishi. */
export async function GET() {
  const databaseUrl = resolveDatabaseUrl();
  const directUrl = resolveDirectUrl();
  const authSecret = resolveAuthSecret();
  const blobToken = resolveBlobToken();

  const config = {
    database: databaseUrl
      ? {
          found: true,
          from: databaseUrl.name,
          looksValid: /^postgres(ql)?:\/\//.test(databaseUrl.value),
          usesPooler: databaseUrl.value.includes("-pooler"),
        }
      : { found: false },
    directUrl: directUrl ? { found: true, from: directUrl.name } : { found: false },
    authSecret: authSecret ? { found: true, from: authSecret.name, longEnough: authSecret.value.length >= 32 } : { found: false },
    storageDriver: process.env.STORAGE_DRIVER?.trim() || "vercel-blob (standart)",
    blobToken: blobToken ? { found: true, from: blobToken.name } : { found: false },
    blobStoreId: Boolean(process.env.BLOB_STORE_ID?.trim()),
  };

  let database: { ok: boolean; users?: number; error?: string };
  try {
    database = { ok: true, users: await db.user.count() };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : undefined;
    const name = error instanceof Error ? error.name : "UnknownError";
    database = { ok: false, error: code ? `${name} (${code})` : name };
  }

  // Fayl xotirasi: faqat o'qish so'rovi (hech narsa yozilmaydi). Xabar matnida maxfiy qiymat bo'lmaydi.
  let storage: { ok: boolean; error?: string };
  try {
    await getStorage().check();
    storage = { ok: true };
  } catch (error) {
    storage = { ok: false, error: error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 300) : "UnknownError" };
  }

  const ok = Boolean(databaseUrl && authSecret && database.ok);
  return NextResponse.json(
    {
      ok,
      deployment: {
        env: process.env.VERCEL_ENV ?? null,
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      },
      config,
      database,
      storage,
      envNamesPresent: relevantEnvNames(),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
