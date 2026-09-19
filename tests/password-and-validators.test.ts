import { describe, expect, it } from "vitest";
import { generateTempPassword } from "@/lib/password";
import { changePasswordSchema, loginSchema } from "@/lib/validators/auth";
import { taskSchema } from "@/lib/validators/tasks";
import { userSchema } from "@/lib/validators/admin";

describe("generateTempPassword (§8.1: kamida 8 belgi, harf va raqam)", () => {
  it("siyosatga mos va chalkash belgilarsiz", () => {
    for (let i = 0; i < 200; i++) {
      const p = generateTempPassword();
      expect(p.length).toBeGreaterThanOrEqual(8);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[0-9]/);
      expect(p).not.toMatch(/[0O1lI]/);
    }
  });

  it("har safar boshqacha", () => {
    const set = new Set(Array.from({ length: 50 }, () => generateTempPassword()));
    expect(set.size).toBe(50);
  });
});

describe("changePasswordSchema", () => {
  const valid = { currentPassword: "Eski12345", newPassword: "Yangi12345", confirmPassword: "Yangi12345" };

  it("to'g'ri ma'lumot o'tadi", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("8 belgidan qisqa, harfsiz, raqamsiz parollar rad etiladi", () => {
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: "Ab1", confirmPassword: "Ab1" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: "12345678", confirmPassword: "12345678" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: "abcdefgh", confirmPassword: "abcdefgh" }).success).toBe(false);
  });

  it("tasdiqlash mos kelmasa rad etiladi", () => {
    const r = changePasswordSchema.safeParse({ ...valid, confirmPassword: "Boshqa12345" });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("bo'sh login yoki parol rad etiladi", () => {
    expect(loginSchema.safeParse({ username: "", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ username: "admin", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ username: "admin", password: "x" }).success).toBe(true);
  });
});

describe("taskSchema (§8.2)", () => {
  const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const futureInput = `${future.getUTCFullYear()}-${pad(future.getUTCMonth() + 1)}-${pad(future.getUTCDate())}T12:00`;
  const valid = {
    title: "Hisobot tayyorlash",
    description: "Oylik hisobotni tayyorlang",
    priority: "MEDIUM",
    deadline: futureInput,
    assigneeIds: ["u1"],
  };

  it("to'g'ri ma'lumot o'tadi", () => {
    expect(taskSchema.safeParse(valid).success).toBe(true);
  });

  it("muddat o'tmishda bo'lmasligi kerak", () => {
    expect(taskSchema.safeParse({ ...valid, deadline: "2020-01-01T10:00" }).success).toBe(false);
  });

  it("kamida bitta ijrochi majburiy", () => {
    expect(taskSchema.safeParse({ ...valid, assigneeIds: [] }).success).toBe(false);
  });

  it("qisqa sarlavha va noto'g'ri ustuvorlik rad etiladi", () => {
    expect(taskSchema.safeParse({ ...valid, title: "ab" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...valid, priority: "CRITICAL" }).success).toBe(false);
  });

  it("'__none__' sentineli bo'sh bo'lim sifatida talqin qilinadi", () => {
    const r = taskSchema.safeParse({ ...valid, departmentId: "__none__" });
    expect(r.success && r.data.departmentId).toBeUndefined();
  });
});

describe("userSchema", () => {
  const valid = { username: "ali.valiyev", fullName: "Ali Valiyev", role: "EXECUTOR" };

  it("to'g'ri ma'lumot o'tadi", () => {
    expect(userSchema.safeParse(valid).success).toBe(true);
  });

  it("login faqat harf, raqam, '_' va '.' dan iborat bo'lishi kerak", () => {
    expect(userSchema.safeParse({ ...valid, username: "ali valiyev" }).success).toBe(false);
    expect(userSchema.safeParse({ ...valid, username: "ali;drop" }).success).toBe(false);
    expect(userSchema.safeParse({ ...valid, username: "al" }).success).toBe(false);
  });

  it("noto'g'ri email va rol rad etiladi, bo'sh email ruxsat", () => {
    expect(userSchema.safeParse({ ...valid, email: "notemail" }).success).toBe(false);
    expect(userSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
    expect(userSchema.safeParse({ ...valid, role: "SUPERUSER" }).success).toBe(false);
  });
});
