import type { Prisma, Role } from "@prisma/client";

export type CurrentUser = {
  id: string;
  role: Role;
  departmentId: string | null;
};

export function isAdmin(user: CurrentUser): boolean {
  return user.role === "ADMIN";
}

export function isManager(user: CurrentUser): boolean {
  return user.role === "MANAGER";
}

// Tashkilotlar/bo'limlar/foydalanuvchilarni faqat ADMIN boshqaradi (§3).
export function canManageOrganizations(user: CurrentUser): boolean {
  return isAdmin(user);
}

export function canManageDepartments(user: CurrentUser): boolean {
  return isAdmin(user);
}

export function canManageUsers(user: CurrentUser): boolean {
  return isAdmin(user);
}

// §8.2: ADMIN va MANAGER topshiriq yarata oladi, EXECUTOR yo'q.
export function canCreateTask(user: CurrentUser): boolean {
  return isAdmin(user) || isManager(user);
}

// §8.2: "MANAGER faqat o'z bo'limi a'zolarini tanlay oladi."
export function canAssignToUser(actor: CurrentUser, target: { departmentId: string | null }): boolean {
  if (isAdmin(actor)) return true;
  if (isManager(actor)) return !!actor.departmentId && target.departmentId === actor.departmentId;
  return false;
}

// §3: MANAGER — o'zi bergan va o'ziga berilgan; EXECUTOR — faqat o'ziga berilgan; ADMIN — hammasi.
export function taskVisibilityWhere(user: CurrentUser): Prisma.TaskWhereInput {
  if (isAdmin(user)) return {};
  if (isManager(user)) {
    return { OR: [{ createdById: user.id }, { assignees: { some: { userId: user.id } } }] };
  }
  return { assignees: { some: { userId: user.id } } };
}

// §14: "EXECUTOR boshqaning topshirig'ini URL orqali ham ocha olmaydi (403)".
export function canViewTask(
  user: CurrentUser,
  task: { createdById: string; assigneeUserIds: string[] }
): boolean {
  if (isAdmin(user)) return true;
  if (isManager(user)) return task.createdById === user.id || task.assigneeUserIds.includes(user.id);
  return task.assigneeUserIds.includes(user.id);
}

// §4: qabul qilish/qaytarish/bekor qilish — faqat ADMIN yoki topshiriq bergan shaxs.
export function canManageTaskAsOwner(user: CurrentUser, task: { createdById: string }): boolean {
  return isAdmin(user) || task.createdById === user.id;
}
