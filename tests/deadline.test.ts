import { describe, expect, it } from "vitest";
import {
  compareByDeadlineState,
  effectiveCompletedAt,
  getDeadlineLabel,
  getDeadlineState,
  getOverdueDays,
  openDeadlineFilterWhere,
} from "@/lib/deadline";
import type { TaskStatus } from "@prisma/client";

const NOW = new Date("2026-09-19T10:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);

function task(status: TaskStatus, deadline: Date, completedAt: Date | null = null) {
  return { status, deadline, completedAt };
}

describe("getDeadlineState (§5)", () => {
  it("bajarilmagan va muddati o'tgan → OVERDUE", () => {
    expect(getDeadlineState(task("IN_PROGRESS", at(-1)), NOW)).toBe("OVERDUE");
    expect(getDeadlineState(task("NEW", at(-5 * DAY)), NOW)).toBe("OVERDUE");
    expect(getDeadlineState(task("RETURNED", at(-1 * HOUR)), NOW)).toBe("OVERDUE");
  });

  it("qabul kutayotgan (SUBMITTED) topshiriq muddati o'tsa ham spec bo'yicha OVERDUE", () => {
    expect(getDeadlineState(task("SUBMITTED", at(-1 * DAY)), NOW)).toBe("OVERDUE");
  });

  it("muddat aynan hozir bo'lsa hali o'tgan emas (now > deadline shart)", () => {
    expect(getDeadlineState(task("NEW", at(0)), NOW)).toBe("DUE_SOON");
  });

  it("48 soat chegarasi: aynan 48 soat → DUE_SOON, 48 soatdan 1 ms ko'p → ON_TRACK", () => {
    expect(getDeadlineState(task("NEW", at(48 * HOUR)), NOW)).toBe("DUE_SOON");
    expect(getDeadlineState(task("NEW", at(48 * HOUR + 1)), NOW)).toBe("ON_TRACK");
    expect(getDeadlineState(task("IN_PROGRESS", at(10 * DAY)), NOW)).toBe("ON_TRACK");
  });

  it("DONE: completedAt <= deadline → DONE_ON_TIME, undan keyin → DONE_LATE", () => {
    expect(getDeadlineState(task("DONE", at(-1 * DAY), at(-1 * DAY)), NOW)).toBe("DONE_ON_TIME");
    expect(getDeadlineState(task("DONE", at(-1 * DAY), at(-2 * DAY)), NOW)).toBe("DONE_ON_TIME");
    expect(getDeadlineState(task("DONE", at(-1 * DAY), at(-1 * DAY + 1)), NOW)).toBe("DONE_LATE");
  });

  it("DONE bo'lsa-yu completedAt yo'q bo'lsa kechikkan hisoblanadi", () => {
    expect(getDeadlineState(task("DONE", at(-1 * DAY), null), NOW)).toBe("DONE_LATE");
  });

  it("CANCELLED muddatdan qat'i nazar CANCELLED", () => {
    expect(getDeadlineState(task("CANCELLED", at(-30 * DAY)), NOW)).toBe("CANCELLED");
    expect(getDeadlineState(task("CANCELLED", at(30 * DAY)), NOW)).toBe("CANCELLED");
  });

  it("kechikib bajarilgan topshiriq keyinroq ham DONE_LATE bo'lib qoladi", () => {
    const later = new Date(NOW.getTime() + 365 * DAY);
    expect(getDeadlineState(task("DONE", at(-2 * DAY), at(-1 * DAY)), later)).toBe("DONE_LATE");
  });
});

describe("getOverdueDays / getDeadlineLabel", () => {
  it("to'liq kunlar soni (pastga yaxlitlanadi), manfiy bo'lmaydi", () => {
    expect(getOverdueDays(at(-5 * DAY - 3 * HOUR), NOW)).toBe(5);
    expect(getOverdueDays(at(-1 * HOUR), NOW)).toBe(0);
    expect(getOverdueDays(at(3 * DAY), NOW)).toBe(0);
  });

  it("uzbekcha yorliqlar", () => {
    expect(getDeadlineLabel(task("NEW", at(-5 * DAY - 3 * HOUR)), NOW)).toBe("Muddati o'tgan · 5 kun");
    expect(getDeadlineLabel(task("NEW", at(1 * DAY)), NOW)).toBe("Muddat yaqinlashmoqda");
    expect(getDeadlineLabel(task("NEW", at(10 * DAY)), NOW)).toBe("Jarayonda");
    expect(getDeadlineLabel(task("DONE", at(1 * DAY), at(0)), NOW)).toBe("O'z vaqtida bajarilgan");
    expect(getDeadlineLabel(task("DONE", at(-1 * DAY), at(0)), NOW)).toBe("Kechikib bajarilgan");
    expect(getDeadlineLabel(task("CANCELLED", at(0)), NOW)).toBe("Bekor qilingan");
  });
});

describe("compareByDeadlineState — standart saralash", () => {
  it("avval OVERDUE, keyin DUE_SOON, keyin muddat bo'yicha; yakunlanganlar oxirida", () => {
    const items = [
      { id: "cancelled", ...task("CANCELLED", at(-1 * DAY)) },
      { id: "onTime", ...task("DONE", at(-1 * DAY), at(-2 * DAY)) },
      { id: "onTrackFar", ...task("NEW", at(20 * DAY)) },
      { id: "late", ...task("DONE", at(-3 * DAY), at(-1 * DAY)) },
      { id: "onTrackNear", ...task("NEW", at(5 * DAY)) },
      { id: "dueSoon", ...task("NEW", at(1 * DAY)) },
      { id: "overdueRecent", ...task("IN_PROGRESS", at(-1 * DAY)) },
      { id: "overdueOld", ...task("NEW", at(-5 * DAY)) },
    ];
    const sorted = [...items].sort((a, b) => compareByDeadlineState(a, b, NOW)).map((i) => i.id);
    expect(sorted).toEqual([
      "overdueOld",
      "overdueRecent",
      "dueSoon",
      "onTrackNear",
      "onTrackFar",
      "late",
      "onTime",
      "cancelled",
    ]);
  });
});

describe("effectiveCompletedAt (§5: kechikish submittedAt bo'yicha)", () => {
  it("ijrochilarning eng oxirgi topshirgan vaqti olinadi", () => {
    const result = effectiveCompletedAt({
      completedAt: at(5 * DAY),
      assignees: [{ submittedAt: at(-2 * DAY) }, { submittedAt: at(-1 * DAY) }, { submittedAt: null }],
    });
    expect(result?.getTime()).toBe(at(-1 * DAY).getTime());
  });

  it("topshirilgan vaqt yo'q bo'lsa completedAt qaytadi", () => {
    expect(effectiveCompletedAt({ completedAt: at(1), assignees: [{ submittedAt: null }] })?.getTime()).toBe(at(1).getTime());
    expect(effectiveCompletedAt({ completedAt: null, assignees: [] })).toBeNull();
  });
});

describe("openDeadlineFilterWhere", () => {
  it("faqat bajarilmagan va bekor qilinmaganlarni qamrab oladi", () => {
    for (const state of ["OVERDUE", "DUE_SOON", "ON_TRACK"] as const) {
      expect(openDeadlineFilterWhere(state, NOW).status).toEqual({ notIn: ["DONE", "CANCELLED"] });
    }
  });

  it("OVERDUE — deadline < now; DUE_SOON — [now, now+48h]; ON_TRACK — > now+48h", () => {
    expect(openDeadlineFilterWhere("OVERDUE", NOW).deadline).toEqual({ lt: NOW });
    expect(openDeadlineFilterWhere("DUE_SOON", NOW).deadline).toEqual({ gte: NOW, lte: at(48 * HOUR) });
    expect(openDeadlineFilterWhere("ON_TRACK", NOW).deadline).toEqual({ gt: at(48 * HOUR) });
  });
});
