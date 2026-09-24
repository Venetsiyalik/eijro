import { describe, expect, it } from "vitest";
import { relevantEnvNames, resolveAuthSecret, resolveDatabaseUrl, resolveDirectUrl } from "@/lib/env";

const POOLED = "postgresql://u:p@ep-x-pooler.neon.tech/db";
const DIRECT = "postgresql://u:p@ep-x.neon.tech/db";

describe("resolveDatabaseUrl", () => {
  it("DATABASE_URL birinchi o'rinda", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: POOLED, POSTGRES_PRISMA_URL: "other" })).toEqual({ name: "DATABASE_URL", value: POOLED });
  });

  it("bo'sh yoki faqat bo'shliqdan iborat qiymat hisobga olinmaydi", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "  ", POSTGRES_PRISMA_URL: POOLED })?.name).toBe("POSTGRES_PRISMA_URL");
  });

  it("Vercel/Neon integratsiya nomlari: POSTGRES_PRISMA_URL, POSTGRES_URL", () => {
    expect(resolveDatabaseUrl({ POSTGRES_URL: POOLED })?.name).toBe("POSTGRES_URL");
    expect(resolveDatabaseUrl({ POSTGRES_URL: "a", POSTGRES_PRISMA_URL: POOLED })?.name).toBe("POSTGRES_PRISMA_URL");
  });

  it("Vercel'dagi haqiqiy holat: bo'sh DATABASE_URL + eijro_ prefiksli integratsiya nomlari", () => {
    const env = { DATABASE_URL: "", DIRECT_URL: "", eijro_DATABASE_URL: POOLED, eijro_DATABASE_URL_UNPOOLED: DIRECT, eijro_POSTGRES_PRISMA_URL: POOLED };
    expect(resolveDatabaseUrl(env)).toEqual({ name: "eijro_DATABASE_URL", value: POOLED });
    expect(resolveDirectUrl(env)).toEqual({ name: "eijro_DATABASE_URL_UNPOOLED", value: DIRECT });
  });

  it("prefiksli nomlar (STORAGE_DATABASE_URL)", () => {
    expect(resolveDatabaseUrl({ STORAGE_DATABASE_URL: POOLED })).toEqual({ name: "STORAGE_DATABASE_URL", value: POOLED });
  });

  it("pooled yo'q bo'lsa direct'ga tushadi", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL_UNPOOLED: DIRECT })?.name).toBe("DATABASE_URL_UNPOOLED");
  });

  it("qiymat atrofidagi bo'shliqlar olib tashlanadi", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: `  ${POOLED}\n` })?.value).toBe(POOLED);
  });

  it("hech narsa yo'q → null", () => {
    expect(resolveDatabaseUrl({})).toBeNull();
  });
});

describe("resolveDirectUrl / resolveAuthSecret", () => {
  it("DIRECT_URL yoki integratsiya nomlari", () => {
    expect(resolveDirectUrl({ DIRECT_URL: DIRECT })?.name).toBe("DIRECT_URL");
    expect(resolveDirectUrl({ POSTGRES_URL_NON_POOLING: DIRECT })?.name).toBe("POSTGRES_URL_NON_POOLING");
    expect(resolveDirectUrl({ STORAGE_DATABASE_URL_UNPOOLED: DIRECT })?.name).toBe("STORAGE_DATABASE_URL_UNPOOLED");
  });

  it("AUTH_SECRET, keyin NEXTAUTH_SECRET", () => {
    expect(resolveAuthSecret({ AUTH_SECRET: "a", NEXTAUTH_SECRET: "b" })?.name).toBe("AUTH_SECRET");
    expect(resolveAuthSecret({ NEXTAUTH_SECRET: "b" })?.name).toBe("NEXTAUTH_SECRET");
    expect(resolveAuthSecret({})).toBeNull();
  });

  it("AUTH_SECRET bo'sh bo'lsa baza manzilidan barqaror zaxira secret hosil qilinadi", () => {
    const env = { AUTH_SECRET: "", eijro_DATABASE_URL: POOLED };
    const a = resolveAuthSecret(env);
    expect(a?.name).toBe("derived:eijro_DATABASE_URL");
    expect(a?.value).toContain(POOLED);
    expect(resolveAuthSecret(env)).toEqual(a);
    expect(resolveAuthSecret({ ...env, AUTH_SECRET: "explicit" })?.name).toBe("AUTH_SECRET");
  });
});

describe("relevantEnvNames", () => {
  it("faqat tegishli nomlar, qiymatsiz", () => {
    const names = relevantEnvNames({ DATABASE_URL: "x", AUTH_SECRET: "y", HOME: "/root", PATH: "/bin", PGHOST: "h" });
    expect(names).toEqual(["AUTH_SECRET", "DATABASE_URL", "PGHOST"]);
  });
});
