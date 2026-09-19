import { forbidden } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { canCreateTask, isManager } from "@/lib/permissions";
import { TaskForm } from "@/components/tasks/task-form";

export default async function NewTaskPage() {
  const user = await requireUser();
  if (!canCreateTask(user)) forbidden();

  const managerScoped = isManager(user);

  const [assignableUsers, departments] = await Promise.all([
    db.user.findMany({
      where: {
        isActive: true,
        ...(managerScoped ? { departmentId: user.departmentId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        departmentId: true,
        department: { select: { name: true } },
      },
      orderBy: { fullName: "asc" },
    }),
    managerScoped
      ? Promise.resolve([])
      : db.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Yangi topshiriq</h1>
      <TaskForm
        assignableUsers={assignableUsers}
        departments={departments}
        isManagerRole={managerScoped}
        defaultDepartmentId={user.departmentId}
      />
    </div>
  );
}
