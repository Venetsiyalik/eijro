"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { canManageTaskAsOwner, isAdmin } from "@/lib/permissions";
import { deleteTaskSchema, updateTaskSchema } from "@/lib/validators/tasks";
import { writeAudit } from "@/lib/audit";
import { notifyMany } from "@/lib/notify";
import { computeTaskStatus } from "@/lib/task-status";
import { parseTashkentLocal } from "@/lib/format";

export type ActionState = { error: string | null; success?: boolean };

const PERMISSION_ERROR = "Bu amalni bajarish huquqingiz yo'q";
const minutes = (d: Date) => Math.floor(d.getTime() / 60000);

/**
 * §7/§8.7: tahrirlash — ADMIN yoki muallif. Muddat o'zgarsa sabab majburiy (§5) va eski/yangi qiymat
 * TaskHistory'ga yoziladi. Ijrochilarni faqat ADMIN o'zgartiradi (ijrochi almashtirish, §8.7).
 */
export async function updateTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const taskId = formData.get("taskId") as string;

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { assignees: { include: { user: { select: { fullName: true } } } } },
  });
  if (!task || task.isDeleted) return { error: "Topshiriq topilmadi" };
  if (!canManageTaskAsOwner(actor, task)) return { error: PERMISSION_ERROR };
  if (task.status === "CANCELLED") return { error: "Bekor qilingan topshiriqni tahrirlab bo'lmaydi" };

  const parsed = updateTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    deadline: formData.get("deadline"),
    reason: formData.get("reason"),
    assigneeIds: formData.getAll("assigneeIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };
  const input = parsed.data;

  const newDeadline = parseTashkentLocal(input.deadline);
  const deadlineChanged = minutes(newDeadline) !== minutes(task.deadline);
  if (deadlineChanged) {
    if (!input.reason) return { error: "Muddatni o'zgartirish sababini kiriting" };
    if (newDeadline.getTime() <= Date.now()) return { error: "Yangi muddat o'tmishda bo'lmasligi kerak" };
  }

  // Ijrochilar (faqat ADMIN)
  let toAdd: { id: string; fullName: string }[] = [];
  let toRemove: typeof task.assignees = [];
  if (isAdmin(actor)) {
    const ids = Array.from(new Set(input.assigneeIds));
    if (ids.length === 0) return { error: "Kamida bitta ijrochi bo'lishi kerak" };

    const currentIds = task.assignees.map((a) => a.userId);
    const addIds = ids.filter((id) => !currentIds.includes(id));
    toRemove = task.assignees.filter((a) => !ids.includes(a.userId));

    if (toRemove.some((a) => a.status === "DONE")) {
      return { error: "Topshiriqni bajargan ijrochini olib tashlab bo'lmaydi" };
    }
    if (addIds.length > 0) {
      const users = await db.user.findMany({
        where: { id: { in: addIds }, isActive: true },
        select: { id: true, fullName: true },
      });
      if (users.length !== addIds.length) return { error: "Tanlangan ijrochilardan biri topilmadi yoki faol emas" };
      toAdd = users;
    }
  }

  const fieldChanges: Record<string, { old: unknown; new: unknown }> = {};
  if (input.title !== task.title) fieldChanges.title = { old: task.title, new: input.title };
  if (input.description !== task.description) fieldChanges.description = { old: task.description, new: input.description };
  if (input.priority !== task.priority) fieldChanges.priority = { old: task.priority, new: input.priority };

  const assigneesChanged = toAdd.length > 0 || toRemove.length > 0;
  if (Object.keys(fieldChanges).length === 0 && !deadlineChanged && !assigneesChanged) {
    return { error: "O'zgarish kiritilmadi" };
  }

  const now = new Date();
  const data: Prisma.TaskUpdateInput = {};
  if (fieldChanges.title) data.title = input.title;
  if (fieldChanges.description) data.description = input.description;
  if (fieldChanges.priority) data.priority = input.priority;
  if (deadlineChanged) data.deadline = newDeadline;

  const keptStatuses = task.assignees.filter((a) => !toRemove.some((r) => r.id === a.id)).map((a) => a.status);
  if (assigneesChanged) {
    const nextStatus: TaskStatus = computeTaskStatus([...keptStatuses, ...toAdd.map((): TaskStatus => "NEW")]);
    data.status = nextStatus;
    data.completedAt = nextStatus === "DONE" ? (task.completedAt ?? now) : null;
  }

  await db.$transaction(async (tx) => {
    await tx.task.update({ where: { id: taskId }, data });

    if (toRemove.length > 0) {
      await tx.taskAssignee.deleteMany({ where: { id: { in: toRemove.map((a) => a.id) } } });
    }
    if (toAdd.length > 0) {
      await tx.taskAssignee.createMany({ data: toAdd.map((u) => ({ taskId, userId: u.id, status: "NEW" as const })) });
    }

    const history: Prisma.TaskHistoryCreateManyInput[] = [];
    if (Object.keys(fieldChanges).length > 0) {
      history.push({
        taskId,
        actorId: actor.id,
        action: "TASK_UPDATED",
        oldValue: Object.fromEntries(Object.entries(fieldChanges).map(([k, v]) => [k, v.old])) as Prisma.InputJsonValue,
        newValue: Object.fromEntries(Object.entries(fieldChanges).map(([k, v]) => [k, v.new])) as Prisma.InputJsonValue,
      });
    }
    if (deadlineChanged) {
      history.push({
        taskId,
        actorId: actor.id,
        action: "DEADLINE_CHANGED",
        oldValue: { deadline: task.deadline.toISOString() },
        newValue: { deadline: newDeadline.toISOString() },
        reason: input.reason,
      });
    }
    for (const u of toAdd) {
      history.push({ taskId, actorId: actor.id, action: "ASSIGNEE_ADDED", newValue: { userId: u.id, fullName: u.fullName } });
    }
    for (const a of toRemove) {
      history.push({
        taskId,
        actorId: actor.id,
        action: "ASSIGNEE_REMOVED",
        oldValue: { userId: a.userId, fullName: a.user.fullName },
      });
    }
    if (history.length > 0) await tx.taskHistory.createMany({ data: history });
  });

  const title = input.title;
  const remainingIds = [
    ...task.assignees.filter((a) => !toRemove.some((r) => r.id === a.id)).map((a) => a.userId),
    ...toAdd.map((u) => u.id),
  ];
  if (deadlineChanged) {
    await notifyMany(remainingIds, "DEADLINE_CHANGED", `"${title}" topshirig'i muddati o'zgartirildi`, taskId);
  }
  if (toAdd.length > 0) {
    await notifyMany(toAdd.map((u) => u.id), "TASK_ASSIGNED", `Sizga yangi topshiriq berildi: "${title}"`, taskId);
  }
  if (toRemove.length > 0) {
    await notifyMany(toRemove.map((a) => a.userId), "TASK_COMMENT", `Siz "${title}" topshirig'idan chetlashtirildingiz`, taskId);
  }

  await writeAudit({
    actorId: actor.id,
    action: "TASK_UPDATED",
    entity: "Task",
    entityId: taskId,
    meta: {
      fields: Object.keys(fieldChanges),
      deadlineChanged,
      added: toAdd.map((u) => u.fullName),
      removed: toRemove.map((a) => a.user.fullName),
    },
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/admin/tasks");
  redirect(`/tasks/${taskId}`);
}

/** §8.7: soft-delete — faqat ADMIN. Ma'lumot saqlanadi, ro'yxat va hisobotlardan yashiriladi. */
export async function softDeleteTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!isAdmin(actor)) return { error: PERMISSION_ERROR };

  const taskId = formData.get("taskId") as string;
  const parsed = deleteTaskSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { error: "Ma'lumotlar noto'g'ri" };

  const task = await db.task.findUnique({ where: { id: taskId }, select: { isDeleted: true } });
  if (!task) return { error: "Topshiriq topilmadi" };
  if (task.isDeleted) return { error: "Topshiriq allaqachon o'chirilgan" };

  await db.$transaction([
    db.task.update({ where: { id: taskId }, data: { isDeleted: true } }),
    db.taskHistory.create({
      data: { taskId, actorId: actor.id, action: "TASK_DELETED", reason: parsed.data.reason },
    }),
  ]);
  await writeAudit({
    actorId: actor.id,
    action: "TASK_DELETED",
    entity: "Task",
    entityId: taskId,
    meta: { reason: parsed.data.reason ?? null },
  });

  revalidatePath("/admin/tasks");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return { error: null, success: true };
}

export async function restoreTask(taskId: string): Promise<{ error: string | null }> {
  const actor = await requireUser();
  if (!isAdmin(actor)) return { error: PERMISSION_ERROR };

  const task = await db.task.findUnique({ where: { id: taskId }, select: { isDeleted: true } });
  if (!task) return { error: "Topshiriq topilmadi" };
  if (!task.isDeleted) return { error: "Topshiriq o'chirilmagan" };

  await db.$transaction([
    db.task.update({ where: { id: taskId }, data: { isDeleted: false } }),
    db.taskHistory.create({ data: { taskId, actorId: actor.id, action: "TASK_RESTORED" } }),
  ]);
  await writeAudit({ actorId: actor.id, action: "TASK_RESTORED", entity: "Task", entityId: taskId });

  revalidatePath("/admin/tasks");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return { error: null };
}
