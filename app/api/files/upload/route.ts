import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/current-user";
import { canViewTask } from "@/lib/permissions";
import { getStorage } from "@/lib/storage";
import { buildStorageKey, isAllowedFile, MAX_FILE_SIZE } from "@/lib/files";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });

  const formData = await request.formData();
  const taskId = formData.get("taskId");
  const file = formData.get("file");

  if (typeof taskId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { assignees: { select: { userId: true } } },
  });
  if (!task || task.isDeleted) {
    return NextResponse.json({ error: "Topshiriq topilmadi" }, { status: 404 });
  }

  const assigneeUserIds = task.assignees.map((a) => a.userId);
  if (!canViewTask(user, { createdById: task.createdById, assigneeUserIds })) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fayl hajmi 20 MB dan katta bo'lmasligi kerak" }, { status: 400 });
  }
  if (!isAllowedFile(file.name, file.type)) {
    return NextResponse.json({ error: "Ushbu fayl turi ruxsat etilmagan" }, { status: 400 });
  }

  const storageKey = buildStorageKey(taskId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await getStorage().put(storageKey, buffer, file.type || "application/octet-stream");

  const attachment = await db.attachment.create({
    data: {
      taskId,
      uploadedById: user.id,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storageKey,
    },
  });

  return NextResponse.json({ id: attachment.id, fileName: attachment.fileName });
}
