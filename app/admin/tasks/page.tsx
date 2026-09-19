import Link from "next/link";
import { Pencil } from "lucide-react";
import type { Prisma, Priority, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  compareByDeadlineState,
  DEADLINE_BADGE_CLASSES,
  DEADLINE_ROW_CLASSES,
  effectiveCompletedAt,
  getDeadlineLabel,
  getDeadlineState,
  openDeadlineFilterWhere,
  type OpenDeadlineFilter,
} from "@/lib/deadline";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { TaskFilters } from "@/components/tasks/task-filters";
import { DeleteTaskButton, RestoreTaskButton } from "@/components/admin/task-delete-restore";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const OPEN_DEADLINE_FILTERS = new Set(["OVERDUE", "DUE_SOON", "ON_TRACK"]);

/** §7/§8.7: BARCHA topshiriqlar (o'chirilganlar ham) — faqat ADMIN (layout va middleware tekshiradi). */
export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const and: Prisma.TaskWhereInput[] = [];
  if (params.deleted === "active") and.push({ isDeleted: false });
  if (params.deleted === "deleted") and.push({ isDeleted: true });
  if (params.status) and.push({ status: params.status as TaskStatus });
  if (params.priority) and.push({ priority: params.priority as Priority });
  if (params.departmentId) and.push({ departmentId: params.departmentId });
  if (params.assigneeId) and.push({ assignees: { some: { userId: params.assigneeId } } });
  if (params.deadlineFilter && OPEN_DEADLINE_FILTERS.has(params.deadlineFilter)) {
    and.push(openDeadlineFilterWhere(params.deadlineFilter as OpenDeadlineFilter));
  }
  if (params.dateFrom) and.push({ deadline: { gte: new Date(`${params.dateFrom}T00:00:00+05:00`) } });
  if (params.dateTo) and.push({ deadline: { lte: new Date(`${params.dateTo}T23:59:59.999+05:00`) } });

  const [tasks, departments, users] = await Promise.all([
    db.task.findMany({
      where: { AND: and },
      include: { assignees: { include: { user: { select: { fullName: true } } } } },
    }),
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);
  const departmentName = new Map(departments.map((d) => [d.id, d.name]));

  const now = new Date();
  // O'chirilganlar pastda, qolganlari standart tartibda (§5)
  const sorted = tasks
    .map((t) => ({ ...t, completedAt: effectiveCompletedAt(t) }))
    .sort((a, b) => Number(a.isDeleted) - Number(b.isDeleted) || compareByDeadlineState(a, b, now));

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pageHref(p: number) {
    const sp = new URLSearchParams(params as Record<string, string>);
    sp.set("page", String(p));
    return `/admin/tasks?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Barcha topshiriqlar</h1>
        <span className="text-sm text-muted-foreground">Jami: {sorted.length}</span>
      </div>

      <TaskFilters
        departments={departments.map((d) => ({ id: d.id, label: d.name }))}
        assignees={users.map((u) => ({ id: u.id, label: u.fullName }))}
        showDepartmentFilter
        showAssigneeFilter
        showDeletedFilter
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>№</TableHead>
            <TableHead>Sarlavha</TableHead>
            <TableHead>Ijrochilar</TableHead>
            <TableHead>Bo&apos;lim</TableHead>
            <TableHead>Ustuvorlik</TableHead>
            <TableHead>Holat</TableHead>
            <TableHead>Muddat</TableHead>
            <TableHead className="text-right">Amallar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((task) => {
            const state = getDeadlineState(task, now);
            const names = task.assignees.map((a) => a.user.fullName);
            return (
              <TableRow
                key={task.id}
                className={cn(task.isDeleted ? "bg-muted/60 text-muted-foreground border-l-4 border-l-transparent" : DEADLINE_ROW_CLASSES[state])}
              >
                <TableCell className="font-mono text-sm">T-{String(task.number).padStart(6, "0")}</TableCell>
                <TableCell>
                  <Link href={`/tasks/${task.id}`} className={cn("font-medium hover:underline", task.isDeleted && "line-through")}>
                    {task.title}
                  </Link>
                  {task.isDeleted && (
                    <Badge variant="destructive" className="ml-2">
                      O&apos;chirilgan
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {names.length > 1 ? `${names[0]} +${names.length - 1}` : (names[0] ?? "—")}
                </TableCell>
                <TableCell className="text-sm">{task.departmentId ? (departmentName.get(task.departmentId) ?? "—") : "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{PRIORITY_LABELS[task.priority]}</Badge>
                </TableCell>
                <TableCell className="text-sm">{STATUS_LABELS[task.status]}</TableCell>
                <TableCell>
                  <Badge className={cn("border", DEADLINE_BADGE_CLASSES[state])}>{getDeadlineLabel(task, now)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {task.isDeleted ? (
                      <RestoreTaskButton taskId={task.id} />
                    ) : (
                      <>
                        {task.status !== "CANCELLED" && (
                          <Button asChild variant="ghost" size="icon" title="Tahrirlash">
                            <Link href={`/tasks/${task.id}/edit`}>
                              <Pencil className="size-4" />
                            </Link>
                          </Button>
                        )}
                        <DeleteTaskButton taskId={task.id} />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {pageItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Topshiriqlar topilmadi
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href={pageHref(Math.max(1, page - 1))} aria-disabled={page === 1} />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink href={pageHref(p)} isActive={p === page}>
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext href={pageHref(Math.min(totalPages, page + 1))} aria-disabled={page === totalPages} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
