import { Suspense } from "react";
import { Bell, CheckCheck } from "lucide-react";
import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { formatDateTime } from "@/lib/format";
import { markAllNotificationsRead, openNotification } from "@/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/layout/page-skeleton";

const TYPE_LABELS: Record<NotificationType, string> = {
  TASK_ASSIGNED: "Yangi topshiriq",
  TASK_SUBMITTED: "Topshirildi",
  TASK_RETURNED: "Qaytarildi",
  TASK_ACCEPTED: "Qabul qilindi",
  TASK_COMMENT: "Yangilik",
  DEADLINE_CHANGED: "Muddat o'zgardi",
  DEADLINE_SOON: "Muddat yaqin",
  TASK_OVERDUE: "Muddati o'tgan",
};

const URGENT_TYPES = new Set<NotificationType>(["TASK_OVERDUE", "TASK_RETURNED"]);

const LIMIT = 100;

async function NotificationsContent() {
  const user = await requireUser();

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
  });
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Bildirishnomalar</h1>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">
              <CheckCheck className="size-4" />
              Hammasini o&apos;qilgan qilish
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          <Bell className="size-8" />
          <p>Bildirishnomalar yo&apos;q</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <form action={openNotification.bind(null, n.id)}>
                <button
                  type="submit"
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60",
                    !n.isRead && "border-primary/40 bg-primary/5",
                    !n.isRead && URGENT_TYPES.has(n.type) && "border-red-300 bg-red-50"
                  )}
                >
                  <span className="min-w-0 space-y-1">
                    <span className={cn("block", !n.isRead && "font-medium")}>{n.title}</span>
                    <span className="block text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                  </span>
                  <Badge variant={n.isRead ? "outline" : "secondary"} className="shrink-0">
                    {TYPE_LABELS[n.type]}
                  </Badge>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {notifications.length === LIMIT && (
        <p className="text-xs text-muted-foreground">Oxirgi {LIMIT} ta bildirishnoma ko&apos;rsatilgan.</p>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NotificationsContent />
    </Suspense>
  );
}
