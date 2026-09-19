import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Login kiritilishi shart"),
  password: z.string().min(1, "Parol kiritilishi shart"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Joriy parolni kiriting"),
    newPassword: z
      .string()
      .min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak")
      .regex(/[A-Za-z]/, "Parolda kamida bitta harf bo'lishi kerak")
      .regex(/[0-9]/, "Parolda kamida bitta raqam bo'lishi kerak"),
    confirmPassword: z.string().min(1, "Parolni tasdiqlang"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Parollar mos kelmadi",
    path: ["confirmPassword"],
  });
