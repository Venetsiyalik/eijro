"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { canManageUsers } from "@/lib/permissions";
import { userSchema } from "@/lib/validators/admin";
import { writeAudit } from "@/lib/audit";
import { generateTempPassword } from "@/lib/password";

export type UserActionState = {
  error: string | null;
  success?: boolean;
  tempPassword?: string;
  username?: string;
};

const PERMISSION_ERROR = "Bu amalni bajarish huquqingiz yo'q";
const HASH_COST = 12;

export async function createUser(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await requireUser();
  if (!canManageUsers(actor)) return { error: PERMISSION_ERROR };

  const parsed = userSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    position: formData.get("position"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    role: formData.get("role"),
    organizationId: formData.get("organizationId"),
    departmentId: formData.get("departmentId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };

  const existing = await db.user.findUnique({ where: { username: parsed.data.username } });
  if (existing) return { error: "Bu login band" };

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, HASH_COST);

  const newUser = await db.user.create({
    data: {
      username: parsed.data.username,
      fullName: parsed.data.fullName,
      position: parsed.data.position ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      role: parsed.data.role,
      organizationId: parsed.data.organizationId ?? null,
      departmentId: parsed.data.departmentId ?? null,
      passwordHash,
      mustChangePassword: true,
    },
  });

  await writeAudit({ actorId: actor.id, action: "USER_CREATED", entity: "User", entityId: newUser.id });
  revalidatePath("/admin/users");
  return { error: null, success: true, tempPassword, username: newUser.username };
}

export async function updateUser(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await requireUser();
  if (!canManageUsers(actor)) return { error: PERMISSION_ERROR };

  const id = formData.get("id") as string;
  if (!id) return { error: "Foydalanuvchi topilmadi" };

  const parsed = userSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    position: formData.get("position"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    role: formData.get("role"),
    organizationId: formData.get("organizationId"),
    departmentId: formData.get("departmentId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };

  const before = await db.user.findUnique({ where: { id } });
  if (!before) return { error: "Foydalanuvchi topilmadi" };

  const duplicate = await db.user.findFirst({ where: { username: parsed.data.username, NOT: { id } } });
  if (duplicate) return { error: "Bu login band" };

  if (before.role === "ADMIN" && parsed.data.role !== "ADMIN") {
    const adminCount = await db.user.count({ where: { role: "ADMIN", isActive: true } });
    if (adminCount <= 1) {
      return { error: "Kamida bitta faol administrator qolishi kerak" };
    }
  }

  await db.user.update({
    where: { id },
    data: {
      username: parsed.data.username,
      fullName: parsed.data.fullName,
      position: parsed.data.position ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      role: parsed.data.role,
      organizationId: parsed.data.organizationId ?? null,
      departmentId: parsed.data.departmentId ?? null,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "USER_UPDATED",
    entity: "User",
    entityId: id,
    meta: {
      before: { username: before.username, fullName: before.fullName, role: before.role },
      after: { username: parsed.data.username, fullName: parsed.data.fullName, role: parsed.data.role },
    },
  });
  revalidatePath("/admin/users");
  return { error: null, success: true };
}

export async function resetUserPassword(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await requireUser();
  if (!canManageUsers(actor)) return { error: PERMISSION_ERROR };

  const id = formData.get("id") as string;
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return { error: "Foydalanuvchi topilmadi" };

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, HASH_COST);

  await db.user.update({
    where: { id },
    data: {
      passwordHash,
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  await writeAudit({ actorId: actor.id, action: "PASSWORD_RESET", entity: "User", entityId: id });
  revalidatePath("/admin/users");
  return { error: null, success: true, tempPassword, username: target.username };
}

export async function toggleUserActive(id: string, nextActive: boolean): Promise<{ error: string | null }> {
  const actor = await requireUser();
  if (!canManageUsers(actor)) return { error: PERMISSION_ERROR };

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return { error: "Foydalanuvchi topilmadi" };

  if (!nextActive && target.role === "ADMIN") {
    const adminCount = await db.user.count({ where: { role: "ADMIN", isActive: true } });
    if (adminCount <= 1) return { error: "Kamida bitta faol administrator qolishi kerak" };
  }

  if (!nextActive && target.id === actor.id) {
    return { error: "O'zingizni bloklay olmaysiz" };
  }

  await db.user.update({ where: { id }, data: { isActive: nextActive } });
  await writeAudit({
    actorId: actor.id,
    action: nextActive ? "USER_ACTIVATED" : "USER_BLOCKED",
    entity: "User",
    entityId: id,
  });
  revalidatePath("/admin/users");
  return { error: null };
}
