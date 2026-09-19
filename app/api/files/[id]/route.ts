import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/current-user";
import { canViewTask } from "@/lib/permissions";
import { getStorage } from "@/lib/storage";
import { sanitizeFileName } from "@/lib/files";

/** §8.4: fayl faqat shu route orqali, huquq tekshirilgandan keyin beriladi. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });

  const attachment = await db.attachment.findUnique({
    where: { id },
    include: { task: { include: { assignees: { select: { userId: true } } } } },
  });
  if (!attachment) return NextResponse.json({ error: "Fayl topilmadi" }, { status: 404 });

  const assigneeUserIds = attachment.task.assignees.map((a) => a.userId);
  if (!canViewTask(user, { createdById: attachment.task.createdById, assigneeUserIds })) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const stream = await getStorage().getStream(attachment.storageKey);
  const asciiFallback = sanitizeFileName(attachment.fileName);

  return new NextResponse(stream, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      "Content-Length": String(attachment.sizeBytes),
    },
  });
}
