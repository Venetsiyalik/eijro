import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  DEADLINE_BADGE_CLASSES,
  DEADLINE_ROW_CLASSES,
  getDeadlineLabel,
  getDeadlineState,
} from "@/lib/deadline";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@prisma/client";

export type TaskLineData = {
  id: string;
  number: number;
  title: string;
  status: TaskStatus;
  deadline: Date;
  completedAt: Date | null;
};

/** Ro'yxat qatori: muddati o'tgan bo'lsa qizil (§5). */
export function TaskLine({ task, now }: { task: TaskLineData; now: Date }) {
  const state = getDeadlineState(task, now);
  return (
    <Link
      href={`/tasks/${task.id}`}
      className={cn("flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/50", DEADLINE_ROW_CLASSES[state])}
    >
      <div className="min-w-0">
        <div className="font-medium truncate">{task.title}</div>
        <div className="text-xs text-muted-foreground">
          T-{String(task.number).padStart(6, "0")} · {formatDateTime(task.deadline)}
        </div>
      </div>
      <Badge className={cn("border shrink-0", DEADLINE_BADGE_CLASSES[state])}>{getDeadlineLabel(task, now)}</Badge>
    </Link>
  );
}
