import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assigneeFindMany: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationCreateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    taskAssignee: { findMany: mocks.assigneeFindMany },
    notification: { findMany: mocks.notificationFindMany, createMany: mocks.notificationCreateMany },
  },
}));

import { generateDeadlineNotifications } from "@/lib/notify";

const NOW = new Date("2026-09-19T10:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const task = (id: string, offsetMs: number) => ({
  task: { id, title: `Topshiriq ${id}`, deadline: new Date(NOW.getTime() + offsetMs) },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.notificationFindMany.mockResolvedValue([]);
});

describe("generateDeadlineNotifications (§6: lazy, bir topshiriq uchun bir marta)", () => {
  it("muddati o'tgan → TASK_OVERDUE, 48 soat ichida → DEADLINE_SOON", async () => {
    mocks.assigneeFindMany.mockResolvedValue([task("late", -HOUR), task("soon", 5 * HOUR)]);
    await generateDeadlineNotifications("u1", NOW);

    const created = mocks.notificationCreateMany.mock.calls[0][0].data as { type: string; taskId: string; userId: string }[];
    expect(created).toHaveLength(2);
    expect(created.find((n) => n.taskId === "late")?.type).toBe("TASK_OVERDUE");
    expect(created.find((n) => n.taskId === "soon")?.type).toBe("DEADLINE_SOON");
    expect(created.every((n) => n.userId === "u1")).toBe(true);
  });

  it("allaqachon yuborilgan tur qayta yaratilmaydi, boshqa tur yaratiladi", async () => {
    mocks.assigneeFindMany.mockResolvedValue([task("a", -HOUR), task("b", 5 * HOUR)]);
    mocks.notificationFindMany.mockResolvedValue([{ taskId: "a", type: "TASK_OVERDUE" }]);
    await generateDeadlineNotifications("u1", NOW);

    const created = mocks.notificationCreateMany.mock.calls[0][0].data as { taskId: string }[];
    expect(created.map((n) => n.taskId)).toEqual(["b"]);
  });

  it("hammasi allaqachon yuborilgan bo'lsa hech narsa yozilmaydi", async () => {
    mocks.assigneeFindMany.mockResolvedValue([task("a", -HOUR)]);
    mocks.notificationFindMany.mockResolvedValue([{ taskId: "a", type: "TASK_OVERDUE" }]);
    await generateDeadlineNotifications("u1", NOW);
    expect(mocks.notificationCreateMany).not.toHaveBeenCalled();
  });

  it("mos topshiriq yo'q bo'lsa mavjud bildirishnomalar so'ralmaydi ham", async () => {
    mocks.assigneeFindMany.mockResolvedValue([]);
    await generateDeadlineNotifications("u1", NOW);
    expect(mocks.notificationFindMany).not.toHaveBeenCalled();
    expect(mocks.notificationCreateMany).not.toHaveBeenCalled();
  });

  it("so'rov: DONE/CANCELLED/SUBMITTED va o'chirilgan topshiriqlar chiqarib tashlanadi, chegara now+48h", async () => {
    mocks.assigneeFindMany.mockResolvedValue([]);
    await generateDeadlineNotifications("u1", NOW);

    const where = mocks.assigneeFindMany.mock.calls[0][0].where;
    expect(where.userId).toBe("u1");
    expect(where.status).toEqual({ notIn: ["DONE", "CANCELLED", "SUBMITTED"] });
    expect(where.task.isDeleted).toBe(false);
    expect(where.task.status).toEqual({ not: "CANCELLED" });
    expect(where.task.deadline).toEqual({ lte: new Date(NOW.getTime() + 48 * HOUR) });
  });
});
