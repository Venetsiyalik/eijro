import type { TaskStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/labels";

export const HISTORY_ACTION_LABELS: Record<string, string> = {
  CREATED: "Topshiriq yaratildi",
  STATUS_CHANGED: "Holat o'zgartirildi",
  DEADLINE_CHANGED: "Muddat o'zgartirildi",
  ASSIGNEE_ADDED: "Ijrochi qo'shildi",
  ASSIGNEE_REMOVED: "Ijrochi olib tashlandi",
  TASK_CANCELLED: "Bekor qilindi",
};

export function historyActionLabel(action: string): string {
  return HISTORY_ACTION_LABELS[action] ?? action;
}

/** "So'nggi faoliyat" uchun qisqa tavsif: STATUS_CHANGED bo'lsa yangi holat ko'rsatiladi. */
export function describeHistory(action: string, newValue: unknown): string {
  const base = historyActionLabel(action);
  if (action === "STATUS_CHANGED" && newValue && typeof newValue === "object" && "status" in newValue) {
    const status = (newValue as { status: string }).status as TaskStatus;
    return `${base}: ${STATUS_LABELS[status] ?? status}`;
  }
  return base;
}
