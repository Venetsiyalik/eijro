import { describe, expect, it } from "vitest";
import {
  canAssignToUser,
  canCreateTask,
  canManageDepartments,
  canManageOrganizations,
  canManageTaskAsOwner,
  canManageUsers,
  canViewReports,
  canViewTask,
  taskVisibilityWhere,
  type CurrentUser,
} from "@/lib/permissions";

const admin: CurrentUser = { id: "admin", role: "ADMIN", departmentId: null };
const manager: CurrentUser = { id: "mgr", role: "MANAGER", departmentId: "it" };
const managerNoDept: CurrentUser = { id: "mgr2", role: "MANAGER", departmentId: null };
const executor: CurrentUser = { id: "exec", role: "EXECUTOR", departmentId: "it" };

describe("boshqaruv huquqlari (§3)", () => {
  it("tashkilot/bo'lim/foydalanuvchini faqat ADMIN boshqaradi", () => {
    for (const fn of [canManageOrganizations, canManageDepartments, canManageUsers]) {
      expect(fn(admin)).toBe(true);
      expect(fn(manager)).toBe(false);
      expect(fn(executor)).toBe(false);
    }
  });

  it("topshiriqni ADMIN va MANAGER yaratadi, EXECUTOR yaratmaydi", () => {
    expect(canCreateTask(admin)).toBe(true);
    expect(canCreateTask(manager)).toBe(true);
    expect(canCreateTask(executor)).toBe(false);
  });

  it("hisobotlarni ADMIN va MANAGER ko'radi", () => {
    expect(canViewReports(admin)).toBe(true);
    expect(canViewReports(manager)).toBe(true);
    expect(canViewReports(executor)).toBe(false);
  });
});

describe("canAssignToUser (§8.2: MANAGER faqat o'z bo'limi)", () => {
  it("ADMIN — istalgan kishiga", () => {
    expect(canAssignToUser(admin, { departmentId: "other" })).toBe(true);
    expect(canAssignToUser(admin, { departmentId: null })).toBe(true);
  });

  it("MANAGER — faqat o'z bo'limi a'zolariga", () => {
    expect(canAssignToUser(manager, { departmentId: "it" })).toBe(true);
    expect(canAssignToUser(manager, { departmentId: "org" })).toBe(false);
    expect(canAssignToUser(manager, { departmentId: null })).toBe(false);
  });

  it("bo'limsiz MANAGER hech kimga bera olmaydi (null === null tuzog'i yo'q)", () => {
    expect(canAssignToUser(managerNoDept, { departmentId: null })).toBe(false);
    expect(canAssignToUser(managerNoDept, { departmentId: "it" })).toBe(false);
  });

  it("EXECUTOR hech kimga bera olmaydi", () => {
    expect(canAssignToUser(executor, { departmentId: "it" })).toBe(false);
  });
});

describe("taskVisibilityWhere va canViewTask (§3, §14)", () => {
  it("ADMIN — cheklovsiz", () => {
    expect(taskVisibilityWhere(admin)).toEqual({});
  });

  it("MANAGER — o'zi bergan yoki o'ziga berilgan", () => {
    expect(taskVisibilityWhere(manager)).toEqual({
      OR: [{ createdById: "mgr" }, { assignees: { some: { userId: "mgr" } } }],
    });
  });

  it("EXECUTOR — faqat o'ziga berilgan", () => {
    expect(taskVisibilityWhere(executor)).toEqual({ assignees: { some: { userId: "exec" } } });
  });

  const task = { createdById: "mgr", assigneeUserIds: ["exec", "exec2"] };

  it("ADMIN hamma topshiriqni ko'radi", () => {
    expect(canViewTask(admin, task)).toBe(true);
  });

  it("MANAGER — o'zi bergan yoki ijrochisi bo'lgan topshiriqni ko'radi, boshqasini yo'q", () => {
    expect(canViewTask(manager, task)).toBe(true);
    expect(canViewTask({ ...manager, id: "other-mgr" }, task)).toBe(false);
    expect(canViewTask({ ...manager, id: "other-mgr" }, { ...task, assigneeUserIds: ["other-mgr"] })).toBe(true);
  });

  it("EXECUTOR boshqaning topshirig'ini ko'ra olmaydi (URL orqali ham — 403)", () => {
    expect(canViewTask(executor, task)).toBe(true);
    expect(canViewTask({ ...executor, id: "stranger" }, task)).toBe(false);
  });
});

describe("canManageTaskAsOwner (§4)", () => {
  it("faqat ADMIN yoki topshiriq bergan shaxs", () => {
    expect(canManageTaskAsOwner(admin, { createdById: "mgr" })).toBe(true);
    expect(canManageTaskAsOwner(manager, { createdById: "mgr" })).toBe(true);
    expect(canManageTaskAsOwner({ ...manager, id: "other" }, { createdById: "mgr" })).toBe(false);
    expect(canManageTaskAsOwner(executor, { createdById: "mgr" })).toBe(false);
  });
});
