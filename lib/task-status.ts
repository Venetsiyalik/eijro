import type { TaskStatus } from "@prisma/client";

/**
 * §4: "Topshiriq umumiy holati: barcha ijrochilar DONE bo'lsa DONE." Boshqa holatlar
 * uchun spec aniq qoida bermagan (ayniqsa bir nechta ijrochi bo'lganda), shuning uchun
 * quyidagi mantiqiy tartib qo'llanildi: eng "oldinda" bo'lgan holat topshiriqning
 * umumiy holatini belgilaydi — birov SUBMITTED qilgan bo'lsa umumiy holat SUBMITTED,
 * birov RETURNED bo'lsa RETURNED, birov ishni boshlagan bo'lsa IN_PROGRESS, aks holda NEW.
 */
export function computeTaskStatus(assigneeStatuses: TaskStatus[]): TaskStatus {
  if (assigneeStatuses.length === 0) return "NEW";
  if (assigneeStatuses.every((s) => s === "DONE")) return "DONE";
  if (assigneeStatuses.some((s) => s === "SUBMITTED")) return "SUBMITTED";
  if (assigneeStatuses.some((s) => s === "RETURNED")) return "RETURNED";
  if (assigneeStatuses.some((s) => s === "IN_PROGRESS" || s === "DONE")) return "IN_PROGRESS";
  return "NEW";
}
