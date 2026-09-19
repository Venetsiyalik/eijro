import type { Prisma, TaskStatus } from "@prisma/client";

export type DeadlineState = "OVERDUE" | "DUE_SOON" | "ON_TRACK" | "DONE_ON_TIME" | "DONE_LATE" | "CANCELLED";

const DUE_SOON_HOURS = 48;

type DeadlineInput = {
  status: TaskStatus;
  deadline: Date;
  completedAt: Date | null;
};

export function getDeadlineState(task: DeadlineInput, now: Date = new Date()): DeadlineState {
  if (task.status === "CANCELLED") return "CANCELLED";

  if (task.status === "DONE") {
    return task.completedAt && task.completedAt <= task.deadline ? "DONE_ON_TIME" : "DONE_LATE";
  }

  if (now > task.deadline) return "OVERDUE";

  const hoursLeft = (task.deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursLeft <= DUE_SOON_HOURS ? "DUE_SOON" : "ON_TRACK";
}

/**
 * §5: "Kechikish submittedAt bo'yicha hisoblanadi (qabul qilish kechiksa ijrochi aybdor bo'lmaydi)".
 * Topshiriq darajasida eng oxirgi ijrochining topshirgan vaqti olinadi; bo'lmasa completedAt.
 */
export function effectiveCompletedAt(task: {
  completedAt: Date | null;
  assignees: { submittedAt: Date | null }[];
}): Date | null {
  const times = task.assignees.flatMap((a) => (a.submittedAt ? [a.submittedAt.getTime()] : []));
  if (times.length === 0) return task.completedAt;
  return new Date(Math.max(...times));
}

export function getOverdueDays(deadline: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)));
}

export function getDeadlineLabel(task: DeadlineInput, now: Date = new Date()): string {
  const state = getDeadlineState(task, now);
  switch (state) {
    case "OVERDUE": {
      const days = getOverdueDays(task.deadline, now);
      return `Muddati o'tgan · ${days} kun`;
    }
    case "DUE_SOON":
      return "Muddat yaqinlashmoqda";
    case "ON_TRACK":
      return "Jarayonda";
    case "DONE_ON_TIME":
      return "O'z vaqtida bajarilgan";
    case "DONE_LATE":
      return "Kechikib bajarilgan";
    case "CANCELLED":
      return "Bekor qilingan";
  }
}

/** Badge (shadcn) uchun variant + qo'shimcha klass. */
export const DEADLINE_BADGE_CLASSES: Record<DeadlineState, string> = {
  OVERDUE: "bg-red-100 text-red-700 border-red-300 hover:bg-red-100",
  DUE_SOON: "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100",
  ON_TRACK: "bg-secondary text-secondary-foreground",
  DONE_ON_TIME: "bg-green-100 text-green-700 border-green-300 hover:bg-green-100",
  DONE_LATE: "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-100",
  CANCELLED: "bg-muted text-muted-foreground",
};

/** Ro'yxat qatori uchun fon/chegara klasslari (§5: muddati o'tgan — qizil). */
export const DEADLINE_ROW_CLASSES: Record<DeadlineState, string> = {
  OVERDUE: "bg-red-50 border-l-4 border-l-red-600",
  DUE_SOON: "bg-yellow-50 border-l-4 border-l-yellow-400",
  ON_TRACK: "border-l-4 border-l-transparent",
  DONE_ON_TIME: "border-l-4 border-l-transparent",
  DONE_LATE: "border-l-4 border-l-transparent",
  CANCELLED: "border-l-4 border-l-transparent opacity-70",
};

/** Standart saralash: avval OVERDUE, keyin DUE_SOON, keyin deadline bo'yicha (§5). */
const SORT_PRIORITY: Record<DeadlineState, number> = {
  OVERDUE: 0,
  DUE_SOON: 1,
  ON_TRACK: 2,
  DONE_LATE: 3,
  DONE_ON_TIME: 4,
  CANCELLED: 5,
};

export function compareByDeadlineState(a: DeadlineInput, b: DeadlineInput, now: Date = new Date()): number {
  const stateDiff = SORT_PRIORITY[getDeadlineState(a, now)] - SORT_PRIORITY[getDeadlineState(b, now)];
  if (stateDiff !== 0) return stateDiff;
  return a.deadline.getTime() - b.deadline.getTime();
}

/** Ro'yxat filtri uchun: faqat bajarilmagan topshiriqlar bo'yicha (DONE/CANCELLED — completedAt bilan solishtirish
 * Prisma'da ustunlararo taqqoslashni talab qiladi, shu sababli bu yerga kiritilmagan; ular "holat" filtri bilan qamrab olinadi). */
export type OpenDeadlineFilter = "OVERDUE" | "DUE_SOON" | "ON_TRACK";

export function openDeadlineFilterWhere(state: OpenDeadlineFilter, now: Date = new Date()): Prisma.TaskWhereInput {
  const dueSoonThreshold = new Date(now.getTime() + DUE_SOON_HOURS * 60 * 60 * 1000);
  const notDoneOrCancelled: Prisma.TaskWhereInput = { status: { notIn: ["DONE", "CANCELLED"] } };

  switch (state) {
    case "OVERDUE":
      return { ...notDoneOrCancelled, deadline: { lt: now } };
    case "DUE_SOON":
      return { ...notDoneOrCancelled, deadline: { gte: now, lte: dueSoonThreshold } };
    case "ON_TRACK":
      return { ...notDoneOrCancelled, deadline: { gt: dueSoonThreshold } };
  }
}
