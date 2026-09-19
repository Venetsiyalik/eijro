import { forbidden } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { canViewReports, isAdmin } from "@/lib/permissions";
import {
  formatPercent,
  groupSummaries,
  loadDirectory,
  loadMetricRows,
  parsePeriod,
  rankByDiscipline,
  summarize,
  type GroupBy,
} from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";

const GROUP_LABELS: Record<GroupBy, string> = {
  employee: "Xodim",
  department: "Bo'lim",
  organization: "Tashkilot",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (!canViewReports(user)) forbidden();

  const params = await searchParams;
  const by: GroupBy =
    params.by === "employee" || params.by === "department" || params.by === "organization"
      ? params.by
      : isAdmin(user)
        ? "department"
        : "employee";

  const period = parsePeriod(params.from, params.to);
  const now = new Date();

  const [rows, directory] = await Promise.all([loadMetricRows(user, period), loadDirectory()]);
  const summary = summarize(rows, now);
  const groups = rankByDiscipline(groupSummaries(rows, by, directory, now));

  const exportParams = new URLSearchParams({ by });
  if (params.from) exportParams.set("from", params.from);
  if (params.to) exportParams.set("to", params.to);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hisobotlar</h1>
        <Button asChild size="sm">
          <a href={`/api/reports/export?${exportParams.toString()}`}>Excel&apos;ga yuklab olish</a>
        </Button>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="from" className="text-xs text-muted-foreground">
            Berilgan sana (dan)
          </label>
          <Input id="from" name="from" type="date" defaultValue={params.from ?? ""} className="w-44" />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="text-xs text-muted-foreground">
            Berilgan sana (gacha)
          </label>
          <Input id="to" name="to" type="date" defaultValue={params.to ?? ""} className="w-44" />
        </div>
        <div className="space-y-1">
          <label htmlFor="by" className="text-xs text-muted-foreground">
            Kesim
          </label>
          <select
            id="by"
            name="by"
            defaultValue={by}
            className="h-9 w-44 rounded-md border bg-transparent px-3 text-sm"
          >
            {(Object.keys(GROUP_LABELS) as GroupBy[]).map((g) => (
              <option key={g} value={g}>
                {GROUP_LABELS[g]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline" size="sm">
          Ko&apos;rsatish
        </Button>
      </form>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Berilgan" value={summary.assigned} />
        <StatCard label="Bajarilgan" value={summary.done} />
        <StatCard label="O'z vaqtida" value={summary.onTime} tone="success" />
        <StatCard label="Kechikib" value={summary.late} />
        <StatCard
          label="Muddati o'tgan (ochiq)"
          value={summary.overdueOpen}
          tone={summary.overdueOpen > 0 ? "danger" : "default"}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Ijro intizomi: <span className="font-semibold text-foreground">{formatPercent(summary.discipline)}</span> = o&apos;z vaqtida
        bajarilgan / (bajarilgan + muddati o&apos;tgan ochiq). Hisob-kitob har bir ijrochi bo&apos;yicha alohida yuritiladi.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{GROUP_LABELS[by]}</TableHead>
            <TableHead className="text-right">Berilgan</TableHead>
            <TableHead className="text-right">Bajarilgan</TableHead>
            <TableHead className="text-right">O&apos;z vaqtida</TableHead>
            <TableHead className="text-right">Kechikib</TableHead>
            <TableHead className="text-right">Muddati o&apos;tgan</TableHead>
            <TableHead className="text-right">Intizom</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => (
            <TableRow key={g.key}>
              <TableCell className="font-medium">{g.label}</TableCell>
              <TableCell className="text-right">{g.summary.assigned}</TableCell>
              <TableCell className="text-right">{g.summary.done}</TableCell>
              <TableCell className="text-right">{g.summary.onTime}</TableCell>
              <TableCell className="text-right">{g.summary.late}</TableCell>
              <TableCell className={g.summary.overdueOpen > 0 ? "text-right font-semibold text-red-700 bg-red-50" : "text-right"}>
                {g.summary.overdueOpen}
              </TableCell>
              <TableCell className="text-right font-medium">{formatPercent(g.summary.discipline)}</TableCell>
            </TableRow>
          ))}
          {groups.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Tanlangan davr uchun ma&apos;lumot yo&apos;q
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
