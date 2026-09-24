/**
 * Muhit o'zgaruvchilarini aniqlash. Vercel'ning Neon integratsiyasi o'zgaruvchilarni boshqa nomlar
 * bilan (POSTGRES_PRISMA_URL, DATABASE_URL_UNPOOLED) yoki prefiks bilan (masalan STORAGE_DATABASE_URL)
 * qo'shishi mumkin — ilova ularni ham taniydi. Edge-safe: faqat process.env o'qiladi.
 */

type Env = Record<string, string | undefined>;

function firstFilled(env: Env, names: string[]): { name: string; value: string } | null {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

/** Prefiksli nomlar: "STORAGE_DATABASE_URL" kabi (suffiks aynan mos kelishi kerak). */
function firstBySuffix(env: Env, suffixes: string[]): { name: string; value: string } | null {
  for (const suffix of suffixes) {
    for (const name of Object.keys(env).sort()) {
      if (name !== suffix && name.endsWith(`_${suffix}`)) {
        const value = env[name]?.trim();
        if (value) return { name, value };
      }
    }
  }
  return null;
}

const DB_POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
const DB_DIRECT = ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];
const AUTH_SECRETS = ["AUTH_SECRET", "NEXTAUTH_SECRET"];

export function resolveDatabaseUrl(env: Env = process.env): { name: string; value: string } | null {
  return firstFilled(env, DB_POOLED) ?? firstBySuffix(env, DB_POOLED) ?? firstFilled(env, DB_DIRECT) ?? firstBySuffix(env, DB_DIRECT);
}

export function resolveDirectUrl(env: Env = process.env): { name: string; value: string } | null {
  return firstFilled(env, DB_DIRECT) ?? firstBySuffix(env, DB_DIRECT);
}

export function resolveAuthSecret(env: Env = process.env): { name: string; value: string } | null {
  return firstFilled(env, AUTH_SECRETS) ?? firstBySuffix(env, AUTH_SECRETS);
}

/** Diagnostika uchun: tegishli o'zgaruvchilarning faqat NOMLARI (qiymatlari emas). */
export function relevantEnvNames(env: Env = process.env): string[] {
  const pattern = /(DATABASE|POSTGRES|^PG|NEON|AUTH|SECRET|BLOB|STORAGE|DIRECT)/i;
  return Object.keys(env)
    .filter((name) => pattern.test(name) && !name.startsWith("npm_"))
    .sort();
}
