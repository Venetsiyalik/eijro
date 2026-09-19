import type { TaskStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export const HISTORY_ACTION_LABELS: Record<string, string> = {
  CREATED: "Topshiriq yaratildi",
  STATUS_CHANGED: "Holat o'zgartirildi",
  DEADLINE_CHANGED: "Muddat o'zgartirildi",
  ASSIGNEE_ADDED: "Ijrochi qo'shildi",
  ASSIGNEE_REMOVED: "Ijrochi olib tashlandi",
  TASK_CANCELLED: "Bekor qilindi",
  TASK_UPDATED: "Ma'lumotlar tahrirlandi",
  TASK_DELETED: "Topshiriq o'chirildi",
  TASK_RESTORED: "Topshiriq tiklandi",
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

const FIELD_LABELS: Record<string, string> = { title: "sarlavha", description: "tavsif", priority: "ustuvorlik" };

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** Tarix yozuvining qo'shimcha tafsiloti (karta sahifasida ko'rsatiladi). */
export function historyDetail(action: string, oldValue: unknown, newValue: unknown): string | null {
  const o = asRecord(oldValue);
  const n = asRecord(newValue);
  switch (action) {
    case "DEADLINE_CHANGED":
      if (typeof o.deadline === "string" && typeof n.deadline === "string") {
        return `${formatDateTime(new Date(o.deadline))} → ${formatDateTime(new Date(n.deadline))}`;
      }
      return null;
    case "ASSIGNEE_ADDED":
      return typeof n.fullName === "string" ? n.fullName : null;
    case "ASSIGNEE_REMOVED":
      return typeof o.fullName === "string" ? o.fullName : null;
    case "TASK_UPDATED": {
      const fields = Object.keys(n).map((k) => FIELD_LABELS[k] ?? k);
      return fields.length > 0 ? `O'zgargan: ${fields.join(", ")}` : null;
    }
    default:
      return null;
  }
}
