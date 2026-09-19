import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  classifyRow,
  formatPercent,
  groupSummaries,
  parsePeriod,
  rankByDelays,
  rankByDiscipline,
  summarize,
  type Directory,
  type MetricRow,
} from "@/lib/metrics";

const NOW = new Date("2026-09-19T10:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const at = (ms: number) => new Date(NOW.getTime() + ms);

let seq = 0;
function row(over: Partial<MetricRow>): MetricRow {
  seq++;
  return {
    assigneeId: `a${seq}`,
    taskId: `t${seq}`,
    taskNumber: seq,
    taskTitle: `Topshiriq ${seq}`,
    deadline: at(5 * DAY),
    createdAt: at(-10 * DAY),
    status: "IN_PROGRESS",
    submittedAt: null,
    acceptedAt: null,
    userId: "u1",
    userName: "Ali",
    departmentId: "d1",
    organizationId: "o1",
    ...over,
  };
}

describe("classifyRow (§5: kechikish submittedAt bo'yicha)", () => {
  it("DONE va topshirilgan vaqt muddatdan oldin → ON_TIME", () => {
    expect(classifyRow(row({ status: "DONE", deadline: at(-1 * DAY), submittedAt: at(-2 * DAY) }), NOW)).toBe("ON_TIME");
  });

  it("qabul kechiksa ijrochi aybdor emas: submittedAt vaqtida, acceptedAt kech → ON_TIME", () => {
    const r = row({ status: "DONE", deadline: at(-3 * DAY), submittedAt: at(-4 * DAY), acceptedAt: at(-1 * DAY) });
    expect(classifyRow(r, NOW)).toBe("ON_TIME");
  });

  it("submittedAt muddatdan keyin → LATE", () => {
    expect(classifyRow(row({ status: "DONE", deadline: at(-3 * DAY), submittedAt: at(-2 * DAY) }), NOW)).toBe("LATE");
  });

  it("submittedAt yo'q bo'lsa acceptedAt ishlatiladi", () => {
    expect(classifyRow(row({ status: "DONE", deadline: at(-3 * DAY), acceptedAt: at(-1 * DAY) }), NOW)).toBe("LATE");
  });

  it("ochiq topshiriq: muddati o'tgan → OVERDUE_OPEN, o'tmagan → OPEN", () => {
    expect(classifyRow(row({ status: "NEW", deadline: at(-1) }), NOW)).toBe("OVERDUE_OPEN");
    expect(classifyRow(row({ status: "SUBMITTED", deadline: at(-1 * DAY) }), NOW)).toBe("OVERDUE_OPEN");
    expect(classifyRow(row({ status: "IN_PROGRESS", deadline: at(1 * DAY) }), NOW)).toBe("OPEN");
  });
});

describe("summarize (§8.6)", () => {
  const rows = [
    row({ status: "DONE", deadline: at(-1 * DAY), submittedAt: at(-2 * DAY) }), // vaqtida
    row({ status: "DONE", deadline: at(-1 * DAY), submittedAt: at(-3 * DAY) }), // vaqtida
    row({ status: "DONE", deadline: at(-5 * DAY), submittedAt: at(-2 * DAY) }), // kechikib
    row({ status: "NEW", deadline: at(-1 * DAY) }), // muddati o'tgan ochiq
    row({ status: "IN_PROGRESS", deadline: at(3 * DAY) }), // ochiq
  ];

  it("hisoblagichlar", () => {
    const s = summarize(rows, NOW);
    expect(s).toMatchObject({ assigned: 5, done: 3, onTime: 2, late: 1, overdueOpen: 1, open: 2 });
  });

  it("ijro intizomi = o'z vaqtida / (bajarilgan + muddati o'tgan ochiq) × 100", () => {
    const s = summarize(rows, NOW);
    expect(s.discipline).toBeCloseTo((2 / (3 + 1)) * 100);
    expect(s.onTimeRate).toBeCloseTo((2 / 3) * 100);
  });

  it("maxraj 0 bo'lsa foiz null (0/0 emas)", () => {
    const s = summarize([row({ status: "IN_PROGRESS", deadline: at(3 * DAY) })], NOW);
    expect(s.discipline).toBeNull();
    expect(s.onTimeRate).toBeNull();
    expect(summarize([], NOW)).toMatchObject({ assigned: 0, discipline: null });
  });

  it("hamma vaqtida bajarilgan → 100%", () => {
    const s = summarize([row({ status: "DONE", deadline: at(1 * DAY), submittedAt: at(-1 * DAY) })], NOW);
    expect(s.discipline).toBe(100);
  });

  it("hech biri vaqtida emas → 0%", () => {
    const s = summarize([row({ status: "NEW", deadline: at(-1 * DAY) })], NOW);
    expect(s.discipline).toBe(0);
  });
});

describe("groupSummaries / reyting", () => {
  const directory: Directory = {
    departments: new Map([
      ["d1", "IT bo'limi"],
      ["d2", "Tashkiliy bo'lim"],
    ]),
    organizations: new Map([["o1", "Respublika Kengashi"]]),
  };

  const rows = [
    row({ userId: "u1", userName: "Ali", departmentId: "d1", status: "DONE", deadline: at(1 * DAY), submittedAt: at(-1 * DAY) }),
    row({ userId: "u1", userName: "Ali", departmentId: "d1", status: "NEW", deadline: at(-1 * DAY) }),
    row({ userId: "u2", userName: "Vali", departmentId: "d2", status: "DONE", deadline: at(1 * DAY), submittedAt: at(-1 * DAY) }),
    row({ userId: "u3", userName: "Guli", departmentId: null, organizationId: null, status: "NEW", deadline: at(-1 * DAY) }),
  ];

  it("xodim, bo'lim va tashkilot kesimlari", () => {
    expect(groupSummaries(rows, "employee", directory, NOW)).toHaveLength(3);

    const byDept = groupSummaries(rows, "department", directory, NOW);
    expect(byDept.map((g) => g.label).sort()).toEqual(["Bo'limsiz", "IT bo'limi", "Tashkiliy bo'lim"]);

    const byOrg = groupSummaries(rows, "organization", directory, NOW);
    expect(byOrg.map((g) => g.label).sort()).toEqual(["Respublika Kengashi", "Tashkilotsiz"]);
  });

  it("intizom bo'yicha reyting: yuqorisi tepada, ma'lumoti yo'qlar oxirida", () => {
    const groups = groupSummaries(rows, "employee", directory, NOW);
    const ranked = rankByDiscipline(groups).map((g) => g.label);
    expect(ranked[0]).toBe("Vali"); // 100%
    expect(ranked[1]).toBe("Ali"); // 50%
    expect(ranked[2]).toBe("Guli"); // 0%
  });

  it("kechiktirganlar ro'yxati faqat kechikkanlarni, ko'pdan kamga tartiblaydi", () => {
    const groups = groupSummaries(rows, "employee", directory, NOW);
    const delays = rankByDelays(groups).map((g) => g.label);
    expect(delays).toEqual(expect.arrayContaining(["Ali", "Guli"]));
    expect(delays).not.toContain("Vali");
  });
});

describe("parsePeriod (Toshkent vaqti, UTC+5)", () => {
  it("kun boshi va oxiri Toshkent bo'yicha", () => {
    const p = parsePeriod("2026-09-01", "2026-09-30");
    expect(p.from?.toISOString()).toBe("2026-08-31T19:00:00.000Z");
    expect(p.to?.toISOString()).toBe("2026-09-30T18:59:59.999Z");
  });

  it("noto'g'ri yoki bo'sh qiymatlar e'tiborga olinmaydi", () => {
    expect(parsePeriod(undefined, undefined)).toEqual({ from: undefined, to: undefined });
    expect(parsePeriod("2026-13-45", "abc")).toEqual({ from: undefined, to: undefined });
    expect(parsePeriod("'; DROP TABLE", "")).toEqual({ from: undefined, to: undefined });
  });
});

describe("formatPercent", () => {
  it("yaxlitlaydi, null uchun tire", () => {
    expect(formatPercent(66.666)).toBe("67%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(null)).toBe("—");
  });
});
