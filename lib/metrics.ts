import type { Prisma, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { isAdmin, isManager, type CurrentUser } from "@/lib/permissions";

/** Bitta ijrochi × bitta topshiriq — hisobotlarning eng kichik birligi. */
export type MetricRow = {
  assigneeId: string;
  taskId: string;
  taskNumber: number;
  taskTitle: string;
  deadline: Date;
  createdAt: Date;
  status: TaskStatus;
  submittedAt: Date | null;
  acceptedAt: Date | null;
  userId: string;
  userName: string;
  departmentId: string | null;
  organizationId: string | null;
};

export type RowOutcome = "ON_TIME" | "LATE" | "OVERDUE_OPEN" | "OPEN";

export type Summary = {
  assigned: number;
  done: number;
  onTime: number;
  late: number;
  overdueOpen: number;
  open: number;
  /** Ijro intizomi % = o'z vaqtida / (bajarilgan + muddati o'tgan ochiq) × 100 (§8.6) */
  discipline: number | null;
  /** O'z vaqtida bajarilganlar ulushi (bajarilganlar ichida) */
  onTimeRate: number | null;
};

const TASHKENT_OFFSET = "+05:00";

/** YYYY-MM-DD -> Toshkent vaqti bo'yicha kun boshi/oxiri (DST yo'q). */
export function parsePeriod(from?: string, to?: string): { from?: Date; to?: Date } {
  const valid = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const f = valid(from);
  const t = valid(to);
  const fromDate = f ? new Date(`${f}T00:00:00.000${TASHKENT_OFFSET}`) : undefined;
  const toDate = t ? new Date(`${t}T23:59:59.999${TASHKENT_OFFSET}`) : undefined;
  return {
    from: fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined,
    to: toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined,
  };
}

/** §3: ADMIN — hamma; MANAGER — o'z bo'limi xodimlari; boshqalar — faqat o'zi. */
function scopeWhere(user: CurrentUser): Prisma.TaskAssigneeWhereInput {
  if (isAdmin(user)) return {};
  if (isManager(user) && user.departmentId) return { user: { departmentId: user.departmentId } };
  return { userId: user.id };
}

export async function loadMetricRows(
  user: CurrentUser,
  opts: { from?: Date; to?: Date; onlyOwn?: boolean } = {}
): Promise<MetricRow[]> {
  const createdAt: Prisma.DateTimeFilter | undefined =
    opts.from || opts.to ? { gte: opts.from, lte: opts.to } : undefined;

  const rows = await db.taskAssignee.findMany({
    where: {
      status: { not: "CANCELLED" },
      task: { isDeleted: false, status: { not: "CANCELLED" }, ...(createdAt ? { createdAt } : {}) },
      ...(opts.onlyOwn ? { userId: user.id } : scopeWhere(user)),
    },
    include: {
      task: { select: { id: true, number: true, title: true, deadline: true, createdAt: true } },
      user: { select: { id: true, fullName: true, departmentId: true, organizationId: true } },
    },
  });

  return rows.map((r) => ({
    assigneeId: r.id,
    taskId: r.task.id,
    taskNumber: r.task.number,
    taskTitle: r.task.title,
    deadline: r.task.deadline,
    createdAt: r.task.createdAt,
    status: r.status,
    submittedAt: r.submittedAt,
    acceptedAt: r.acceptedAt,
    userId: r.user.id,
    userName: r.user.fullName,
    departmentId: r.user.departmentId,
    organizationId: r.user.organizationId,
  }));
}

/** §5: kechikish submittedAt bo'yicha; muddati o'tgan ochiq — WHERE status NOT IN (DONE, CANCELLED) AND deadline < now. */
export function classifyRow(row: MetricRow, now: Date = new Date()): RowOutcome {
  if (row.status === "DONE") {
    const doneAt = row.submittedAt ?? row.acceptedAt;
    return doneAt && doneAt > row.deadline ? "LATE" : "ON_TIME";
  }
  return row.deadline < now ? "OVERDUE_OPEN" : "OPEN";
}

export function summarize(rows: MetricRow[], now: Date = new Date()): Summary {
  let onTime = 0;
  let late = 0;
  let overdueOpen = 0;
  let open = 0;

  for (const row of rows) {
    const outcome = classifyRow(row, now);
    if (outcome === "ON_TIME") onTime++;
    else if (outcome === "LATE") late++;
    else if (outcome === "OVERDUE_OPEN") {
      overdueOpen++;
      open++;
    } else open++;
  }

  const done = onTime + late;
  const denominator = done + overdueOpen;
  return {
    assigned: rows.length,
    done,
    onTime,
    late,
    overdueOpen,
    open,
    discipline: denominator > 0 ? (onTime / denominator) * 100 : null,
    onTimeRate: done > 0 ? (onTime / done) * 100 : null,
  };
}

export type GroupBy = "employee" | "department" | "organization";

export type GroupRow = { key: string; label: string; summary: Summary };

export type Directory = { departments: Map<string, string>; organizations: Map<string, string> };

export async function loadDirectory(): Promise<Directory> {
  const [departments, organizations] = await Promise.all([
    db.department.findMany({ select: { id: true, name: true } }),
    db.organization.findMany({ select: { id: true, name: true, shortName: true } }),
  ]);
  return {
    departments: new Map(departments.map((d) => [d.id, d.name])),
    organizations: new Map(organizations.map((o) => [o.id, o.shortName ?? o.name])),
  };
}

export function groupSummaries(
  rows: MetricRow[],
  by: GroupBy,
  directory: Directory,
  now: Date = new Date()
): GroupRow[] {
  const groups = new Map<string, { label: string; rows: MetricRow[] }>();

  for (const row of rows) {
    let key: string;
    let label: string;
    if (by === "employee") {
      key = row.userId;
      label = row.userName;
    } else if (by === "department") {
      key = row.departmentId ?? "__none__";
      label = row.departmentId ? (directory.departments.get(row.departmentId) ?? "—") : "Bo'limsiz";
    } else {
      key = row.organizationId ?? "__none__";
      label = row.organizationId ? (directory.organizations.get(row.organizationId) ?? "—") : "Tashkilotsiz";
    }
    const group = groups.get(key) ?? { label, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }

  return Array.from(groups.entries()).map(([key, g]) => ({ key, label: g.label, summary: summarize(g.rows, now) }));
}

/** Intizom bo'yicha kamayish tartibida (ma'lumoti yo'qlar oxirida). */
export function rankByDiscipline(groups: GroupRow[]): GroupRow[] {
  return [...groups].sort((a, b) => (b.summary.discipline ?? -1) - (a.summary.discipline ?? -1));
}

/** Kechikkanlar soni (kechikib bajarilgan + muddati o'tgan ochiq) bo'yicha kamayish tartibida. */
export function rankByDelays(groups: GroupRow[]): GroupRow[] {
  const delays = (g: GroupRow) => g.summary.late + g.summary.overdueOpen;
  return [...groups].filter((g) => delays(g) > 0).sort((a, b) => delays(b) - delays(a));
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}
