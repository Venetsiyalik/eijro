import type { Role, Priority, TaskStatus } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  MANAGER: "Bo'lim boshlig'i",
  EXECUTOR: "Ijrochi",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Past",
  MEDIUM: "O'rta",
  HIGH: "Yuqori",
  URGENT: "Shoshilinch",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  NEW: "Yangi",
  IN_PROGRESS: "Bajarilmoqda",
  SUBMITTED: "Topshirildi",
  RETURNED: "Qaytarildi",
  DONE: "Bajarildi",
  CANCELLED: "Bekor qilindi",
};
