import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma, Priority, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { canCreateTask, isAdmin, isManager, taskVisibilityWhere } from "@/lib/permissions";
import {
  compareByDeadlineState,
  effectiveCompletedAt,
  DEADLINE_BADGE_CLASSES,
  DEADLINE_ROW_CLASSES,
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
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const OPEN_DEADLINE_FILTERS = new Set(["OVERDUE", "DUE_SOON", "ON_TRACK"]);

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const where: Prisma.TaskWhereInput = {
    isDeleted: false,
    AND: [taskVisibilityWhere(user)],
  };
  const andConditions = where.AND as Prisma.TaskWhereInput[];

  if (params.status) andConditions.push({ status: params.status as TaskStatus });
  if (params.priority) andConditions.push({ priority: params.priority as Priority });
  if (params.departmentId) andConditions.push({ departmentId: params.departmentId });
  if (params.assigneeId) andConditions.push({ assignees: { some: { userId: params.assigneeId } } });
  if (params.deadlineFilter && OPEN_DEADLINE_FILTERS.has(params.deadlineFilter)) {
    andConditions.push(openDeadlineFilterWhere(params.deadlineFilter as OpenDeadlineFilter));
  }
  if (params.dateFrom) andConditions.push({ deadline: { gte: new Date(params.dateFrom) } });
  if (params.dateTo) andConditions.push({ deadline: { lte: new Date(`${params.dateTo}T23:59:59`) } });

  const [allTasks, departments, assignableUsers, allDepartments] = await Promise.all([
    db.task.findMany({
      where,
      include: {
        assignees: { include: { user: { select: { fullName: true } } } },
      },
    }),
    isAdmin(user) ? db.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    isAdmin(user) || isManager(user)
      ? db.user.findMany({
          where: { isActive: true, ...(isManager(user) ? { departmentId: user.departmentId } : {}) },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        })
      : Promise.resolve([]),
    db.department.findMany({ select: { id: true, name: true } }),
  ]);

  const departmentNameById = new Map(allDepartments.map((d) => [d.id, d.name]));

  const now = new Date();
  const sorted = allTasks
    .map((t) => ({ ...t, completedAt: effectiveCompletedAt(t) }))
    .sort((a, b) => compareByDeadlineState(a, b, now));

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pageHref(p: number) {
    const sp = new URLSearchParams(params as Record<string, string>);
    sp.set("page", String(p));
    return `/tasks?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Topshiriqlar</h1>
        {canCreateTask(user) && (
          <Button asChild size="sm">
            <Link href="/tasks/new">
              <Plus className="size-4" />
              Yangi topshiriq
            </Link>
          </Button>
        )}
      </div>

      <TaskFilters
        departments={departments.map((d) => ({ id: d.id, label: d.name }))}
        assignees={assignableUsers.map((u) => ({ id: u.id, label: u.fullName }))}
        showDepartmentFilter={isAdmin(user)}
        showAssigneeFilter={isAdmin(user) || isManager(user)}
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((task) => {
            const state = getDeadlineState(task, now);
            const assigneeNames = task.assignees.map((a) => a.user.fullName);
            return (
              <TableRow key={task.id} className={cn(DEADLINE_ROW_CLASSES[state])}>
                <TableCell className="font-mono text-sm">T-{String(task.number).padStart(6, "0")}</TableCell>
                <TableCell>
                  <Link href={`/tasks/${task.id}`} className="font-medium hover:underline">
                    {task.title}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">
                  {assigneeNames.length > 1
                    ? `${assigneeNames[0]} +${assigneeNames.length - 1}`
                    : (assigneeNames[0] ?? "—")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {task.departmentId ? (departmentNameById.get(task.departmentId) ?? "—") : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{PRIORITY_LABELS[task.priority]}</Badge>
                </TableCell>
                <TableCell className="text-sm">{STATUS_LABELS[task.status]}</TableCell>
                <TableCell>
                  <Badge className={cn("border", DEADLINE_BADGE_CLASSES[state])}>{getDeadlineLabel(task, now)}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
          {pageItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
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
