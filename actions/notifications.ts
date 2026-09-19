"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";

/** Bildirishnomani o'qilgan qiladi va tegishli topshiriqqa o'tadi (faqat o'ziniki). */
export async function openNotification(id: string) {
  const user = await requireUser();
  const notification = await db.notification.findFirst({ where: { id, userId: user.id } });
  if (!notification) redirect("/notifications");

  if (!notification.isRead) {
    await db.notification.update({ where: { id: notification.id }, data: { isRead: true } });
  }
  redirect(notification.taskId ? `/tasks/${notification.taskId}` : "/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/notifications");
}
