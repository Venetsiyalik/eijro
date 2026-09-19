import { headers } from "next/headers";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type AuditEntry = {
  actorId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
};

export async function writeAudit(entry: AuditEntry) {
  let ip: string | null = null;
  let userAgent: string | null = null;

  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    userAgent = h.get("user-agent");
  } catch {
    // headers() faqat request kontekstida ishlaydi (masalan, cron'da yo'q)
  }

  await db.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      meta: entry.meta as Prisma.InputJsonValue | undefined,
      ip,
      userAgent,
    },
  });
}
