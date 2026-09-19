import { notFound, forbidden } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { canManageTaskAsOwner, canViewTask } from "@/lib/permissions";
import { ensureTaskOpened } from "@/actions/tasks";
import {
  DEADLINE_BADGE_CLASSES,
  getDeadlineLabel,
  getDeadlineState,
} from "@/lib/deadline";
import { PRIORITY_LABELS, ROLE_LABELS, STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { historyActionLabel } from "@/lib/history-labels";
import { formatFileSize } from "@/lib/files";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SubmitTaskForm } from "@/components/tasks/submit-task-form";
import { AcceptButton, ReturnButton } from "@/components/tasks/accept-return-buttons";
import { CancelTaskButton } from "@/components/tasks/cancel-task-button";
import { CommentForm } from "@/components/tasks/comment-form";
import { FileUploadForm } from "@/components/tasks/file-upload-form";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const preCheck = await db.task.findUnique({
    where: { id },
    select: { isDeleted: true, createdById: true, assignees: { select: { userId: true } } },
  });
  if (!preCheck || preCheck.isDeleted) notFound();

  const preAssigneeIds = preCheck.assignees.map((a) => a.userId);
  if (!canViewTask(user, { createdById: preCheck.createdById, assigneeUserIds: preAssigneeIds })) forbidden();

  if (preAssigneeIds.includes(user.id)) {
    await ensureTaskOpened(id, user.id);
  }

  const task = await db.task.findUnique({
    where: { id },
    include: {
      createdBy: { select: { fullName: true, role: true } },
      assignees: { include: { user: { select: { id: true, fullName: true, username: true } } } },
      history: { include: { actor: { select: { fullName: true } } }, orderBy: { createdAt: "asc" } },
      comments: { include: { author: { select: { fullName: true } } }, orderBy: { createdAt: "asc" } },
      attachments: true,
    },
  });
  if (!task) notFound();

  const department = task.departmentId
    ? await db.department.findUnique({ where: { id: task.departmentId }, select: { name: true } })
    : null;

  const now = new Date();
  const state = getDeadlineState(task, now);

  const myAssignee = task.assignees.find((a) => a.userId === user.id);
  const isOwnerOrAdmin = canManageTaskAsOwner(user, task);
  const canCancel = isOwnerOrAdmin && task.status !== "CANCELLED";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground font-mono">T-{String(task.number).padStart(6, "0")}</div>
        <h1 className="text-2xl font-semibold">{task.title}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{PRIORITY_LABELS[task.priority]}</Badge>
        <Badge variant="secondary">{STATUS_LABELS[task.status]}</Badge>
        <Badge className={cn("border", DEADLINE_BADGE_CLASSES[state])}>{getDeadlineLabel(task, now)}</Badge>
        {canCancel && (
          <div className="ml-auto">
            <CancelTaskButton taskId={task.id} />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tavsif</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{task.description}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Bergan shaxs</div>
          <div>
            {task.createdBy.fullName} <span className="text-muted-foreground">({ROLE_LABELS[task.createdBy.role]})</span>
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Bo&apos;lim</div>
          <div>{department?.name ?? "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Yaratilgan sana</div>
          <div>{formatDateTime(task.createdAt)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Muddat</div>
          <div>{formatDateTime(task.deadline)}</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ijrochilar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {task.assignees.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <span>
                {a.user.fullName} <span className="text-muted-foreground">({a.user.username})</span>
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{STATUS_LABELS[a.status]}</Badge>
                {isOwnerOrAdmin && a.status === "SUBMITTED" && (
                  <>
                    <AcceptButton taskId={task.id} assigneeId={a.id} />
                    <ReturnButton taskId={task.id} assigneeId={a.id} />
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {myAssignee && myAssignee.status === "IN_PROGRESS" && <SubmitTaskForm taskId={task.id} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fayllar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hali fayl yuklanmagan</p>
          ) : (
            <ul className="text-sm space-y-2">
              {task.attachments.map((f) => (
                <li key={f.id} className="flex items-center justify-between">
                  <a href={`/api/files/${f.id}`} className="text-primary hover:underline" download>
                    {f.fileName}
                  </a>
                  <span className="text-muted-foreground text-xs">
                    {formatFileSize(f.sizeBytes)}
                    {f.isResult && " · natija"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <FileUploadForm taskId={task.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Izohlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hali izoh yo&apos;q</p>
          ) : (
            <div className="space-y-3">
              {task.comments.map((c) => (
                <div key={c.id} className="text-sm">
                  <div className="font-medium">{c.author.fullName}</div>
                  <div className="text-muted-foreground text-xs">{formatDateTime(c.createdAt)}</div>
                  <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
                </div>
              ))}
            </div>
          )}
          <CommentForm taskId={task.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {task.history.map((h, i) => (
              <div key={h.id}>
                {i > 0 && <Separator className="mb-3" />}
                <div className="text-sm font-medium">{historyActionLabel(h.action)}</div>
                <div className="text-xs text-muted-foreground">
                  {h.actor.fullName} · {formatDateTime(h.createdAt)}
                </div>
                {h.reason && <p className="text-sm mt-1">Sabab: {h.reason}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
