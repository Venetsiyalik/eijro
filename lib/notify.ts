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
