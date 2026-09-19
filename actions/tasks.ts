"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { canAssignToUser, canCreateTask, canManageTaskAsOwner, canViewTask, isManager } from "@/lib/permissions";
import {
  acceptTaskSchema,
  cancelTaskSchema,
  commentSchema,
  returnTaskSchema,
  submitTaskSchema,
  taskSchema,
} from "@/lib/validators/tasks";
import { writeAudit } from "@/lib/audit";
import { notify, notifyMany } from "@/lib/notify";
import { computeTaskStatus } from "@/lib/task-status";
import { getStorage } from "@/lib/storage";
import { buildStorageKey, isAllowedFile, MAX_FILE_SIZE } from "@/lib/files";

export type ActionState = { error: string | null; success?: boolean };

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!canCreateTask(actor)) return { error: "Bu amalni bajarish huquqingiz yo'q" };

  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    deadline: formData.get("deadline"),
    departmentId: formData.get("departmentId"),
    assigneeIds: formData.getAll("assigneeIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };

  const assignees = await db.user.findMany({
    where: { id: { in: parsed.data.assigneeIds } },
    select: { id: true, departmentId: true, isActive: true },
  });
  if (assignees.length !== parsed.data.assigneeIds.length || assignees.some((a) => !a.isActive)) {
    return { error: "Tanlangan ijrochilardan biri topilmadi yoki faol emas" };
  }
  if (!assignees.every((a) => canAssignToUser(actor, a))) {
    return { error: "Faqat o'z bo'limingiz a'zolariga topshiriq bera olasiz" };
  }

  const departmentId = isManager(actor) ? actor.departmentId : (parsed.data.departmentId ?? null);

  const task = await db.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      deadline: new Date(parsed.data.deadline),
      createdById: actor.id,
      departmentId,
      assignees: {
        create: parsed.data.assigneeIds.map((userId) => ({ userId, status: "NEW" as const })),
      },
      history: {
        create: {
          actorId: actor.id,
          action: "CREATED",
          newValue: { status: "NEW", deadline: parsed.data.deadline },
        },
      },
    },
  });

  await notifyMany(
    parsed.data.assigneeIds,
    "TASK_ASSIGNED",
    `Sizga yangi topshiriq berildi: "${parsed.data.title}"`,
    task.id
  );

  await writeAudit({ actorId: actor.id, action: "TASK_CREATED", entity: "Task", entityId: task.id });

  redirect(`/tasks/${task.id}`);
}

/**
 * §4: "ijrochi topshiriqni birinchi ochganda avtomatik" IN_PROGRESS'ga o'tadi.
 * RETURNED holatini ham shu yerga qo'shamiz: ijrochi qaytarilgan topshiriqni ochganda
 * qayta ishlashga tayyor IN_PROGRESS'ga o'tadi (sabab tarixda saqlanib qoladi).
 * Server Component'dan chaqiriladi — bu yerda faqat kerak bo'lsagina yozadi (idempotent).
 */
export async function ensureTaskOpened(taskId: string, userId: string): Promise<void> {
  const assignee = await db.taskAssignee.findUnique({
    where: { taskId_userId: { taskId, userId } },
  });
  if (!assignee || (assignee.status !== "NEW" && assignee.status !== "RETURNED")) return;

  await db.$transaction([
    db.taskAssignee.update({
      where: { id: assignee.id },
      data: { status: "IN_PROGRESS", openedAt: assignee.openedAt ?? new Date() },
    }),
    db.taskHistory.create({
      data: {
        taskId,
        actorId: userId,
        action: "STATUS_CHANGED",
        oldValue: { assigneeId: assignee.id, status: assignee.status },
        newValue: { assigneeId: assignee.id, status: "IN_PROGRESS" },
      },
    }),
  ]);

  const siblings = await db.taskAssignee.findMany({ where: { taskId }, select: { status: true } });
  await db.task.update({
    where: { id: taskId },
    data: { status: computeTaskStatus(siblings.map((s) => s.status)) },
  });
}

export async function submitTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const taskId = formData.get("taskId") as string;

  const parsed = submitTaskSchema.safeParse({ comment: formData.get("comment") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };

  const assignee = await db.taskAssignee.findUnique({ where: { taskId_userId: { taskId, userId: actor.id } } });
  if (!assignee) return { error: "Siz bu topshiriqning ijrochisi emassiz" };
  if (assignee.status !== "IN_PROGRESS") return { error: "Bu topshiriqni hozir topshirib bo'lmaydi" };

  // §8.3: "natija fayli ixtiyoriy (isResult=true)" — mavjud bo'lsa DB'ga yozishdan oldin saqlanadi.
  const resultFile = formData.get("resultFile");
  let fileData: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number } | null = null;
  if (resultFile instanceof File && resultFile.size > 0) {
    if (resultFile.size > MAX_FILE_SIZE) return { error: "Fayl hajmi 20 MB dan katta bo'lmasligi kerak" };
    if (!isAllowedFile(resultFile.name, resultFile.type)) return { error: "Ushbu fayl turi ruxsat etilmagan" };
    const storageKey = buildStorageKey(taskId, resultFile.name);
    const buffer = Buffer.from(await resultFile.arrayBuffer());
    await getStorage().put(storageKey, buffer, resultFile.type || "application/octet-stream");
    fileData = {
      storageKey,
      fileName: resultFile.name,
      mimeType: resultFile.type || "application/octet-stream",
      sizeBytes: resultFile.size,
    };
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    const comment = await tx.taskComment.create({
      data: { taskId, authorId: actor.id, body: parsed.data.comment },
    });
    await tx.taskAssignee.update({
      where: { id: assignee.id },
      data: { status: "SUBMITTED", submittedAt: now },
    });
    await tx.taskHistory.create({
      data: {
        taskId,
        actorId: actor.id,
        action: "STATUS_CHANGED",
        oldValue: { assigneeId: assignee.id, status: assignee.status },
        newValue: { assigneeId: assignee.id, status: "SUBMITTED" },
      },
    });
    if (fileData) {
      await tx.attachment.create({
        data: {
          taskId,
          commentId: comment.id,
          uploadedById: actor.id,
          isResult: true,
          ...fileData,
        },
      });
    }
  });

  const siblings = await db.taskAssignee.findMany({ where: { taskId }, select: { status: true } });
  const task = await db.task.update({
    where: { id: taskId },
    data: { status: computeTaskStatus(siblings.map((s) => s.status)) },
    select: { title: true, createdById: true },
  });

  await notify(task.createdById, "TASK_SUBMITTED", `"${task.title}" topshiriq ijroga topshirildi`, taskId);
  await writeAudit({ actorId: actor.id, action: "TASK_SUBMITTED", entity: "Task", entityId: taskId });

  revalidatePath(`/tasks/${taskId}`);
  return { error: null, success: true };
}

export async function acceptTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const taskId = formData.get("taskId") as string;

  const parsed = acceptTaskSchema.safeParse({ assigneeId: formData.get("assigneeId") });
  if (!parsed.success) return { error: "Ma'lumotlar noto'g'ri" };

  const task = await db.task.findUnique({ where: { id: taskId }, select: { createdById: true, title: true, deadline: true } });
  if (!task) return { error: "Topshiriq topilmadi" };
  if (!canManageTaskAsOwner(actor, task)) return { error: "Bu amalni bajarish huquqingiz yo'q" };

  const assignee = await db.taskAssignee.findUnique({ where: { id: parsed.data.assigneeId } });
  if (!assignee || assignee.taskId !== taskId) return { error: "Ijrochi topilmadi" };
  if (assignee.status !== "SUBMITTED") return { error: "Bu ijrochi hali natija topshirmagan" };

  const now = new Date();

  await db.$transaction([
    db.taskAssignee.update({
      where: { id: assignee.id },
      data: { status: "DONE", acceptedAt: now },
    }),
    db.taskHistory.create({
      data: {
        taskId,
        actorId: actor.id,
        action: "STATUS_CHANGED",
        oldValue: { assigneeId: assignee.id, status: "SUBMITTED" },
        newValue: { assigneeId: assignee.id, status: "DONE" },
      },
    }),
  ]);

  const siblings = await db.taskAssignee.findMany({ where: { taskId }, select: { status: true } });
  const newStatus = computeTaskStatus(siblings.map((s) => s.status));
  await db.task.update({
    where: { id: taskId },
    data: {
      status: newStatus,
      completedAt: newStatus === "DONE" ? now : null,
    },
  });

  await notify(assignee.userId, "TASK_ACCEPTED", `"${task.title}" topshirig'ingiz qabul qilindi`, taskId);
  await writeAudit({ actorId: actor.id, action: "TASK_ACCEPTED", entity: "Task", entityId: taskId });

  revalidatePath(`/tasks/${taskId}`);
  return { error: null, success: true };
}

export async function returnTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const taskId = formData.get("taskId") as string;

  const parsed = returnTaskSchema.safeParse({
    assigneeId: formData.get("assigneeId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };

  const task = await db.task.findUnique({ where: { id: taskId }, select: { createdById: true, title: true } });
  if (!task) return { error: "Topshiriq topilmadi" };
  if (!canManageTaskAsOwner(actor, task)) return { error: "Bu amalni bajarish huquqingiz yo'q" };

  const assignee = await db.taskAssignee.findUnique({ where: { id: parsed.data.assigneeId } });
  if (!assignee || assignee.taskId !== taskId) return { error: "Ijrochi topilmadi" };
  if (assignee.status !== "SUBMITTED") return { error: "Bu ijrochi hali natija topshirmagan" };

  await db.$transaction([
    db.taskAssignee.update({
      where: { id: assignee.id },
      data: { status: "RETURNED" },
    }),
    db.taskHistory.create({
      data: {
        taskId,
        actorId: actor.id,
        action: "STATUS_CHANGED",
        oldValue: { assigneeId: assignee.id, status: "SUBMITTED" },
        newValue: { assigneeId: assignee.id, status: "RETURNED" },
        reason: parsed.data.reason,
      },
    }),
  ]);

  const siblings = await db.taskAssignee.findMany({ where: { taskId }, select: { status: true } });
  await db.task.update({
    where: { id: taskId },
    data: { status: computeTaskStatus(siblings.map((s) => s.status)) },
  });

  await notify(assignee.userId, "TASK_RETURNED", `"${task.title}" topshiriq qaytarildi`, taskId);
  await writeAudit({ actorId: actor.id, action: "TASK_RETURNED", entity: "Task", entityId: taskId });

  revalidatePath(`/tasks/${taskId}`);
  return { error: null, success: true };
}

export async function cancelTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const taskId = formData.get("taskId") as string;

  const parsed = cancelTaskSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { error: "Ma'lumotlar noto'g'ri" };

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { createdById: true, title: true, status: true },
  });
  if (!task) return { error: "Topshiriq topilmadi" };
  if (!canManageTaskAsOwner(actor, task)) return { error: "Bu amalni bajarish huquqingiz yo'q" };
  if (task.status === "CANCELLED") return { error: "Topshiriq allaqachon bekor qilingan" };

  const assignees = await db.taskAssignee.findMany({ where: { taskId }, select: { userId: true } });

  await db.$transaction([
    db.task.update({ where: { id: taskId }, data: { status: "CANCELLED" } }),
    db.taskAssignee.updateMany({ where: { taskId }, data: { status: "CANCELLED" } }),
    db.taskHistory.create({
      data: {
        taskId,
        actorId: actor.id,
        action: "TASK_CANCELLED",
        oldValue: { status: task.status },
        newValue: { status: "CANCELLED" },
        reason: parsed.data.reason,
      },
    }),
  ]);

  await notifyMany(
    assignees.map((a) => a.userId),
    "TASK_COMMENT",
    `"${task.title}" topshiriq bekor qilindi`,
    taskId
  );
  await writeAudit({ actorId: actor.id, action: "TASK_CANCELLED", entity: "Task", entityId: taskId });

  revalidatePath(`/tasks/${taskId}`);
  return { error: null, success: true };
}

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const taskId = formData.get("taskId") as string;

  const parsed = commentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { assignees: { select: { userId: true } } },
  });
  if (!task) return { error: "Topshiriq topilmadi" };

  const assigneeUserIds = task.assignees.map((a) => a.userId);
  if (!canViewTask(actor, { createdById: task.createdById, assigneeUserIds })) {
    return { error: "Bu amalni bajarish huquqingiz yo'q" };
  }

  await db.taskComment.create({ data: { taskId, authorId: actor.id, body: parsed.data.body } });

  const recipients = new Set([task.createdById, ...assigneeUserIds]);
  recipients.delete(actor.id);
  await notifyMany(Array.from(recipients), "TASK_COMMENT", `"${task.title}" topshirig'iga izoh qoldirildi`, taskId);

  revalidatePath(`/tasks/${taskId}`);
  return { error: null, success: true };
}
