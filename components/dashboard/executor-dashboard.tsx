import Link from "next/link";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/permissions";
import { compareByDeadlineState, getDeadlineState } from "@/lib/deadline";
import { getTashkentRanges } from "@/lib/format";
import { formatPercent, loadMetricRows, summarize } from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { TaskLine } from "@/components/dashboard/task-line";

const MAX_LIST = 10;

/** §8.5: EXECUTOR — mening topshiriqlarim (muddati o'tganlar tepada, qizil), bugun/shu hafta muddati tugaydiganlar. */
export async function ExecutorDashboard({ user }: { user: CurrentUser }) {
  const now = new Date();
  const { endOfToday, endOfWeek } = getTashkentRanges(now);

  const [tasks, ownRows] = await Promise.all([
    db.task.findMany({
      where: {
        isDeleted: false,
        status: { not: "CANCELLED" },
        assignees: { some: { userId: user.id, status: { notIn: ["DONE", "CANCELLED"] } } },
      },
      select: { id: true, number: true, title: true, status: true, deadline: true, completedAt: true },
    }),
    loadMetricRows(user, { onlyOwn: true }),
  ]);

  const sorted = [...tasks].sort((a, b) => compareByDeadlineState(a, b, now));
  const overdue = sorted.filter((t) => getDeadlineState(t, now) === "OVERDUE");
  const today = sorted.filter((t) => t.deadline >= now && t.deadline <= endOfToday);
  const thisWeek = sorted.filter((t) => t.deadline > endOfToday && t.deadline <= endOfWeek);
  const summary = summarize(ownRows, now);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mening topshiriqlarim</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/tasks">Barcha topshiriqlar</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Muddati o'tgan" value={overdue.length} tone={overdue.length > 0 ? "danger" : "default"} />
        <StatCard label="Bugun tugaydi" value={today.length} />
        <StatCard label="Shu hafta tugaydi" value={thisWeek.length} />
        <StatCard
          label="Ijro intizomim"
          value={formatPercent(summary.discipline)}
          hint={`${summary.onTime} vaqtida / ${summary.late} kechikib`}
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bugun muddati tugaydiganlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {today.length === 0 && <p className="text-sm text-muted-foreground">Yo&apos;q</p>}
            {today.map((t) => (
              <TaskLine key={t.id} task={t} now={now} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shu hafta muddati tugaydiganlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {thisWeek.length === 0 && <p className="text-sm text-muted-foreground">Yo&apos;q</p>}
            {thisWeek.map((t) => (
              <TaskLine key={t.id} task={t} now={now} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ochiq topshiriqlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.length === 0 && <p className="text-sm text-muted-foreground">Ochiq topshiriqlar yo&apos;q</p>}
          {sorted.slice(0, MAX_LIST).map((t) => (
            <TaskLine key={t.id} task={t} now={now} />
          ))}
          {sorted.length > MAX_LIST && (
            <Link href="/tasks" className="block text-sm text-primary hover:underline pt-1">
              Yana {sorted.length - MAX_LIST} ta topshiriq…
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
