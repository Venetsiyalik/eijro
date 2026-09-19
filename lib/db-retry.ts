/**
 * Neon (serverless Postgres) bo'sh turganda uxlab qoladi, birinchi so'rovda ulanish vaqtincha uziladi.
 * Shunday o'tkinchi xatolarda so'rov qayta uriniladi.
 *
 * Xavfsizlik: yozish amali ikki marta bajarilib qolmasligi uchun yozishlar faqat so'rov serverga
 * YETIB BORMAGAN xatolarda (P1001, P2024) takrorlanadi; ulanish uzilgan (P1017 va h.k.) xatolarda —
 * faqat o'qish amallari.
 */
const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

/** So'rov bazaga yetmagan: P1001 — bazaga ulanib bo'lmadi, P2024 — ulanish havzasidan bo'sh joy kutish tugadi. */
const NEVER_EXECUTED = new Set(["P1001", "P2024"]);

/** So'rov bajarilgan-bajarilmagani noma'lum: P1017 — server ulanishni yopdi, P1002 — vaqt tugadi. */
const MAYBE_EXECUTED = new Set(["P1017", "P1002"]);

export const RETRY_DELAYS_MS = [300, 900, 2000];

function errorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function isRetryable(error: unknown, operation: string): boolean {
  const code = errorCode(error);
  if (!code) return false;
  if (NEVER_EXECUTED.has(code)) return true;
  return MAYBE_EXECUTED.has(code) && READ_OPERATIONS.has(operation);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  operation: string,
  delaysMs: number[] = RETRY_DELAYS_MS,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= delaysMs.length || !isRetryable(error, operation)) throw error;
      await sleep(delaysMs[attempt]);
    }
  }
}
