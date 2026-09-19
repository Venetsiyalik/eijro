import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

export async function notify(userId: string, type: NotificationType, title: string, taskId?: string) {
  await db.notification.create({ data: { userId, type, title, taskId } });
}

export async function notifyMany(userIds: string[], type: NotificationType, title: string, taskId?: string) {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return;
  await db.notification.createMany({
    data: unique.map((userId) => ({ userId, type, title, taskId })),
  });
}

const DUE_SOON_MS = 48 * 60 * 60 * 1000;

/**
 * §6 eslatma: DEADLINE_SOON va TASK_OVERDUE foydalanuvchi sahifa ochganda "lazy" yaratiladi
 * (bir topshiriq uchun har tur bir marta). Topshirib qabul kutayotganlarga eslatilmaydi.
 */
export async function generateDeadlineNotifications(userId: string, now: Date = new Date()): Promise<void> {
  const rows = await db.taskAssignee.findMany({
    where: {
      userId,
      status: { notIn: ["DONE", "CANCELLED", "SUBMITTED"] },
      task: { isDeleted: false, status: { not: "CANCELLED" }, deadline: { lte: new Date(now.getTime() + DUE_SOON_MS) } },
    },
    select: { task: { select: { id: true, title: true, deadline: true } } },
  });
  if (rows.length === 0) return;

  const existing = await db.notification.findMany({
    where: { userId, type: { in: ["DEADLINE_SOON", "TASK_OVERDUE"] }, taskId: { in: rows.map((r) => r.task.id) } },
    select: { taskId: true, type: true },
  });
  const has = new Set(existing.map((n) => `${n.taskId}:${n.type}`));

  const toCreate = rows.flatMap(({ task }) => {
    const overdue = task.deadline < now;
    const type: NotificationType = overdue ? "TASK_OVERDUE" : "DEADLINE_SOON";
    if (has.has(`${task.id}:${type}`)) return [];
    const title = overdue
      ? `"${task.title}" topshirig'ining muddati o'tib ketdi`
      : `"${task.title}" topshirig'i muddati yaqinlashmoqda`;
    return [{ userId, type, title, taskId: task.id }];
  });

  if (toCreate.length > 0) await db.notification.createMany({ data: toCreate });
}

/** Sarlavhadagi qo'ng'iroq uchun: lazy bildirishnomalarni yaratadi va o'qilmaganlar sonini qaytaradi. */
export async function refreshAndCountUnread(userId: string): Promise<number> {
  try {
    await generateDeadlineNotifications(userId);
  } catch (error) {
    console.error("Deadline bildirishnomalarini yaratib bo'lmadi:", error);
  }
  return db.notification.count({ where: { userId, isRead: false } });
}
