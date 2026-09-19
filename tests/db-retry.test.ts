import { describe, expect, it, vi } from "vitest";
import { isRetryable, withRetry } from "@/lib/db-retry";

const dbError = (code: string) => Object.assign(new Error(`Prisma ${code}`), { code });
const noSleep = () => Promise.resolve();

describe("isRetryable", () => {
  it("P1001/P2024 (so'rov bazaga yetmagan) — o'qish ham, yozish ham takrorlanadi", () => {
    for (const op of ["findMany", "update", "create", "createMany", "delete", "upsert"]) {
      expect(isRetryable(dbError("P1001"), op), op).toBe(true);
      expect(isRetryable(dbError("P2024"), op), op).toBe(true);
    }
  });

  it("P1017/P1002 (bajarilgani noma'lum) — faqat o'qish amallari takrorlanadi", () => {
    for (const op of ["findUnique", "findFirst", "findMany", "count", "groupBy", "aggregate"]) {
      expect(isRetryable(dbError("P1017"), op), op).toBe(true);
    }
    for (const op of ["create", "update", "delete", "createMany", "updateMany", "deleteMany", "upsert"]) {
      expect(isRetryable(dbError("P1017"), op), op).toBe(false);
      expect(isRetryable(dbError("P1002"), op), op).toBe(false);
    }
  });

  it("mantiqiy xatolar va begona xatolar takrorlanmaydi (masalan unique constraint P2002)", () => {
    expect(isRetryable(dbError("P2002"), "create")).toBe(false);
    expect(isRetryable(dbError("P2025"), "update")).toBe(false);
    expect(isRetryable(new Error("oddiy xato"), "findMany")).toBe(false);
    expect(isRetryable(null, "findMany")).toBe(false);
    expect(isRetryable("P1001", "findMany")).toBe(false);
  });
});

describe("withRetry", () => {
  it("muvaffaqiyatli so'rov bir marta bajariladi", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(fn, "findMany", [1, 1], noSleep)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("o'tkinchi xatodan keyin qayta uriniladi va natija qaytadi", async () => {
    const fn = vi.fn().mockRejectedValueOnce(dbError("P1001")).mockRejectedValueOnce(dbError("P1001")).mockResolvedValue("ok");
    const sleep = vi.fn(async (ms: number) => {
      void ms;
    });
    await expect(withRetry(fn, "findUnique", [300, 900, 2000], sleep)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([300, 900]);
  });

  it("urinishlar tugagach oxirgi xatoni tashlaydi", async () => {
    const fn = vi.fn().mockRejectedValue(dbError("P1001"));
    await expect(withRetry(fn, "findMany", [1, 1, 1], noSleep)).rejects.toMatchObject({ code: "P1001" });
    expect(fn).toHaveBeenCalledTimes(4); // 1 + 3 takror
  });

  it("yozish amalida ulanish uzilsa (P1017) takrorlanmaydi — ikki marta yozilib ketmasin", async () => {
    const fn = vi.fn().mockRejectedValue(dbError("P1017"));
    await expect(withRetry(fn, "create", [1, 1], noSleep)).rejects.toMatchObject({ code: "P1017" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("mantiqiy xato darrov tashlanadi", async () => {
    const fn = vi.fn().mockRejectedValue(dbError("P2002"));
    await expect(withRetry(fn, "findMany", [1, 1], noSleep)).rejects.toMatchObject({ code: "P2002" });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
