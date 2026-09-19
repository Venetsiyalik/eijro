import Link from "next/link";
import { db } from "@/lib/db";
import { isAdmin, taskVisibilityWhere, type CurrentUser } from "@/lib/permissions";
import {
  formatPercent,
  groupSummaries,
  loadDirectory,
  loadMetricRows,
  rankByDelays,
  rankByDiscipline,
  summarize,
} from "@/lib/metrics";
import { describeHistory } from "@/lib/history-labels";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { DelayList, DisciplineTable } from "@/components/dashboard/discipline-table";

/** §8.5: ADMIN — butun tizim, MANAGER — o'z bo'limi bo'yicha. */
export async function ManagementDashboard({ user }: { user: CurrentUser }) {
  const now = new Date();

  const [rows, directory, activity] = await Promise.all([
    loadMetricRows(user),
    loadDirectory(),
    db.taskHistory.findMany({
      where: { task: { isDeleted: false, AND: [taskVisibilityWhere(user)] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        actor: { select: { fullName: true } },
        task: { select: { id: true, number: true, title: true } },
      },
    }),
  ]);

  const summary = summarize(rows, now);
  const employees = groupSummaries(rows, "employee", directory, now);
  const ranking = isAdmin(user)
    ? rankByDiscipline(groupSummaries(rows, "department", directory, now))
    : rankByDiscipline(employees);
  const delays = rankByDelays(employees).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bosh sahifa</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/reports">Hisobotlar</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jami" value={summary.assigned} />
        <StatCard label="Bajarilmoqda" value={summary.open - summary.overdueOpen} hint="muddati o'tmagan ochiq" />
        <StatCard label="Muddati o'tgan" value={summary.overdueOpen} tone={summary.overdueOpen > 0 ? "danger" : "default"} />
        <StatCard
          label="O'z vaqtida bajarilgan"
          value={formatPercent(summary.onTimeRate)}
          hint={`${summary.onTime} / ${summary.done} bajarilgan`}
          tone="success"
        />
      </div>
      <p className="text-xs text-muted-foreground">Hisob-kitob har bir ijrochi bo&apos;yicha alohida yuritiladi.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <DisciplineTable
          title={isAdmin(user) ? "Bo'limlar reytingi (ijro intizomi)" : "Xodimlar reytingi (ijro intizomi)"}
          rows={ranking}
        />
        <DelayList rows={delays} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">So&apos;nggi faoliyat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.length === 0 && <p className="text-sm text-muted-foreground">Faoliyat yo&apos;q</p>}
          {activity.map((h) => (
            <div key={h.id} className="text-sm">
              <div>
                <Link href={`/tasks/${h.task.id}`} className="font-medium hover:underline">
                  {h.task.title}
                </Link>{" "}
                <span className="text-muted-foreground">— {describeHistory(h.action, h.newValue)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {h.actor.fullName} · {formatDateTime(h.createdAt)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
