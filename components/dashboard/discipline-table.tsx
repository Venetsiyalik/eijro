import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, type GroupRow } from "@/lib/metrics";
import { cn } from "@/lib/utils";

function barColor(value: number | null): string {
  if (value === null) return "bg-muted";
  if (value >= 80) return "bg-green-500";
  if (value >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

/** Ijro intizomi % bo'yicha reyting (bo'limlar yoki xodimlar). */
export function DisciplineTable({ title, rows }: { title: string; rows: GroupRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q</p>}
        {rows.map((row) => (
          <div key={row.key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="text-muted-foreground">
                {formatPercent(row.summary.discipline)}
                <span className="text-xs"> · {row.summary.onTime} vaqtida / {row.summary.late} kechikib / {row.summary.overdueOpen} muddati o&apos;tgan</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full", barColor(row.summary.discipline))}
                style={{ width: `${Math.round(row.summary.discipline ?? 0)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DelayList({ rows }: { rows: GroupRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Eng ko&apos;p kechiktirgan xodimlar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Kechikishlar yo&apos;q</p>}
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between text-sm">
            <span className="font-medium">{row.label}</span>
            <span className="text-muted-foreground">
              <span className="text-red-700 font-medium">{row.summary.late + row.summary.overdueOpen}</span>
              <span className="text-xs">
                {" "}
                ({row.summary.late} kechikib bajargan, {row.summary.overdueOpen} muddati o&apos;tgan)
              </span>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
