import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" && v !== "__none__" ? v.trim() : undefined));

export const taskSchema = z.object({
  title: z.string().min(3, "Sarlavha kamida 3 belgidan iborat bo'lishi kerak"),
  description: z.string().min(3, "Tavsif kiritilishi shart"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  deadline: z
    .string()
    .min(1, "Muddat kiritilishi shart")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Muddat noto'g'ri")
    .refine((v) => new Date(v).getTime() > Date.now(), "Muddat o'tmishda bo'lmasligi kerak"),
  departmentId: optionalString,
  assigneeIds: z.array(z.string().min(1)).min(1, "Kamida bitta ijrochi tanlang"),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const submitTaskSchema = z.object({
  comment: z.string().min(3, "Izoh kiritilishi shart"),
});

export const returnTaskSchema = z.object({
  assigneeId: z.string().min(1),
  reason: z.string().min(3, "Qaytarish sababi kiritilishi shart"),
});

export const acceptTaskSchema = z.object({
  assigneeId: z.string().min(1),
});

export const cancelTaskSchema = z.object({
  reason: optionalString,
});

export const commentSchema = z.object({
  body: z.string().min(1, "Izoh bo'sh bo'lishi mumkin emas"),
});
