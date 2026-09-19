import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { canManageTaskAsOwner, isAdmin } from "@/lib/permissions";
import { toTashkentInputValue } from "@/lib/format";
import { TaskEditForm } from "@/components/tasks/task-edit-form";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const task = await db.task.findUnique({
    where: { id },
    include: { assignees: { select: { userId: true } } },
  });
  if (!task || task.isDeleted) notFound();
  if (!canManageTaskAsOwner(user, task)) forbidden();

  const currentAssigneeIds = task.assignees.map((a) => a.userId);
  const admin = isAdmin(user);

  const users = admin
    ? await db.user.findMany({
        where: { OR: [{ isActive: true }, { id: { in: currentAssigneeIds } }] },
        select: { id: true, fullName: true, username: true, department: { select: { name: true } } },
        orderBy: { fullName: "asc" },
      })
    : [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground font-mono">T-{String(task.number).padStart(6, "0")}</div>
        <h1 className="text-2xl font-semibold">Topshiriqni tahrirlash</h1>
      </div>

      {task.status === "CANCELLED" ? (
        <p className="text-sm text-muted-foreground">
          Bekor qilingan topshiriqni tahrirlab bo&apos;lmaydi.{" "}
          <Link href={`/tasks/${task.id}`} className="text-primary hover:underline">
            Orqaga
          </Link>
        </p>
      ) : (
        <TaskEditForm
          task={{
            id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            deadlineInput: toTashkentInputValue(task.deadline),
          }}
          canEditAssignees={admin}
          users={users.map((u) => ({
            id: u.id,
            fullName: u.fullName,
            username: u.username,
            departmentName: u.department?.name ?? null,
          }))}
          currentAssigneeIds={currentAssigneeIds}
        />
      )}
    </div>
  );
}
