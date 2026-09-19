"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { canManageOrganizations } from "@/lib/permissions";
import { organizationSchema } from "@/lib/validators/admin";
import { writeAudit } from "@/lib/audit";

export type ActionState = { error: string | null; success?: boolean };

const PERMISSION_ERROR = "Bu amalni bajarish huquqingiz yo'q";

export async function createOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!canManageOrganizations(user)) return { error: PERMISSION_ERROR };

  const parsed = organizationSchema.safeParse({
    name: formData.get("name"),
    shortName: formData.get("shortName"),
    region: formData.get("region"),
    parentId: formData.get("parentId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };

  const org = await db.organization.create({
    data: {
      name: parsed.data.name,
      shortName: parsed.data.shortName ?? null,
      region: parsed.data.region ?? null,
      parentId: parsed.data.parentId ?? null,
    },
  });

  await writeAudit({ actorId: user.id, action: "ORG_CREATED", entity: "Organization", entityId: org.id });
  revalidatePath("/admin/organizations");
  return { error: null, success: true };
}

export async function updateOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!canManageOrganizations(user)) return { error: PERMISSION_ERROR };

  const id = formData.get("id") as string;
  if (!id) return { error: "Tashkilot topilmadi" };

  const parsed = organizationSchema.safeParse({
    name: formData.get("name"),
    shortName: formData.get("shortName"),
    region: formData.get("region"),
    parentId: formData.get("parentId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };

  if (parsed.data.parentId === id) {
    return { error: "Tashkilot o'zini ota-tashkilot qilib bo'lmaydi" };
  }

  const before = await db.organization.findUnique({ where: { id } });
  if (!before) return { error: "Tashkilot topilmadi" };

  await db.organization.update({
    where: { id },
    data: {
      name: parsed.data.name,
      shortName: parsed.data.shortName ?? null,
      region: parsed.data.region ?? null,
      parentId: parsed.data.parentId ?? null,
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "ORG_UPDATED",
    entity: "Organization",
    entityId: id,
    meta: { before, after: parsed.data },
  });
  revalidatePath("/admin/organizations");
  return { error: null, success: true };
}

export async function toggleOrganizationActive(id: string, nextActive: boolean): Promise<ActionState> {
  const user = await requireUser();
  if (!canManageOrganizations(user)) return { error: PERMISSION_ERROR };

  await db.organization.update({ where: { id }, data: { isActive: nextActive } });
  await writeAudit({
    actorId: user.id,
    action: nextActive ? "ORG_ACTIVATED" : "ORG_DEACTIVATED",
    entity: "Organization",
    entityId: id,
  });
  revalidatePath("/admin/organizations");
  return { error: null, success: true };
}
