"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { canManageDepartments } from "@/lib/permissions";
import { departmentSchema } from "@/lib/validators/admin";
import { writeAudit } from "@/lib/audit";

export type ActionState = { error: string | null; success?: boolean };

const PERMISSION_ERROR = "Bu amalni bajarish huquqingiz yo'q";

export async function createDepartment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!canManageDepartments(user)) return { error: PERMISSION_ERROR };

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    organizationId: formData.get("organizationId"),
    headId: formData.get("headId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };

  const existing = await db.department.findUnique({
    where: { organizationId_name: { organizationId: parsed.data.organizationId, name: parsed.data.name } },
  });
  if (existing) return { error: "Bu tashkilotda shu nomli bo'lim allaqachon mavjud" };

  const dept = await db.department.create({
    data: { name: parsed.data.name, organizationId: parsed.data.organizationId },
  });

  if (parsed.data.headId) {
    await db.$transaction([
      db.department.update({ where: { id: dept.id }, data: { headId: parsed.data.headId } }),
      db.user.update({ where: { id: parsed.data.headId }, data: { departmentId: dept.id } }),
    ]);
  }

  await writeAudit({ actorId: user.id, action: "DEPARTMENT_CREATED", entity: "Department", entityId: dept.id });
  revalidatePath("/admin/departments");
  return { error: null, success: true };
}

export async function updateDepartment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!canManageDepartments(user)) return { error: PERMISSION_ERROR };

  const id = formData.get("id") as string;
  if (!id) return { error: "Bo'lim topilmadi" };

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    organizationId: formData.get("organizationId"),
    headId: formData.get("headId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };

  const before = await db.department.findUnique({ where: { id } });
  if (!before) return { error: "Bo'lim topilmadi" };

  const duplicate = await db.department.findFirst({
    where: { organizationId: parsed.data.organizationId, name: parsed.data.name, NOT: { id } },
  });
  if (duplicate) return { error: "Bu tashkilotda shu nomli bo'lim allaqachon mavjud" };

  await db.department.update({
    where: { id },
    data: {
      name: parsed.data.name,
      organizationId: parsed.data.organizationId,
      headId: parsed.data.headId ?? null,
    },
  });

  if (parsed.data.headId) {
    await db.user.update({ where: { id: parsed.data.headId }, data: { departmentId: id } });
  }

  await writeAudit({
    actorId: user.id,
    action: "DEPARTMENT_UPDATED",
    entity: "Department",
    entityId: id,
    meta: { before, after: parsed.data },
  });
  revalidatePath("/admin/departments");
  return { error: null, success: true };
}

export async function toggleDepartmentActive(id: string, nextActive: boolean): Promise<ActionState> {
  const user = await requireUser();
  if (!canManageDepartments(user)) return { error: PERMISSION_ERROR };

  await db.department.update({ where: { id }, data: { isActive: nextActive } });
  await writeAudit({
    actorId: user.id,
    action: nextActive ? "DEPARTMENT_ACTIVATED" : "DEPARTMENT_DEACTIVATED",
    entity: "Department",
    entityId: id,
  });
  revalidatePath("/admin/departments");
  return { error: null, success: true };
}
