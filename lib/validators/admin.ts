import { z } from "zod";

// "__none__" — shadcn Select'da bo'sh qiymatni ifodalash uchun sentinel (Radix bo'sh string'ni qabul qilmaydi).
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" && v !== "__none__" ? v.trim() : undefined));

export const organizationSchema = z.object({
  name: z.string().min(2, "Nomi kamida 2 belgidan iborat bo'lishi kerak"),
  shortName: optionalString,
  region: optionalString,
  parentId: optionalString,
});
export type OrganizationInput = z.infer<typeof organizationSchema>;

export const departmentSchema = z.object({
  name: z.string().min(2, "Nomi kamida 2 belgidan iborat bo'lishi kerak"),
  organizationId: z.string().min(1, "Tashkilot tanlanishi shart"),
  headId: optionalString,
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const userSchema = z.object({
  username: z
    .string()
    .min(3, "Login kamida 3 belgidan iborat bo'lishi kerak")
    .regex(/^[a-zA-Z0-9_.]+$/, "Login faqat harf, raqam, \"_\" va \".\" belgilaridan iborat bo'lishi mumkin"),
  fullName: z.string().min(2, "F.I.Sh kiritilishi shart"),
  position: optionalString,
  phone: optionalString,
  email: z.string().email("Email manzil noto'g'ri").optional().or(z.literal("")).transform((v) => v || undefined),
  role: z.enum(["ADMIN", "MANAGER", "EXECUTOR"]),
  organizationId: optionalString,
  departmentId: optionalString,
});
export type UserInput = z.infer<typeof userSchema>;
