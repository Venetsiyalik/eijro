import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auditActionLabel } from "@/lib/audit-labels";
import { formatDateTime } from "@/lib/format";
import { parsePeriod } from "@/lib/metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 50;

function metaSummary(meta: unknown): string {
  if (meta === null || meta === undefined) return "";
  const text = JSON.stringify(meta);
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

/** §8.7: audit jurnali — filtr (foydalanuvchi, harakat, sana) va sahifalash. */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const period = parsePeriod(params.from, params.to);

  const where: Prisma.AuditLogWhereInput = {
    ...(params.actorId ? { actorId: params.actorId } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(period.from || period.to ? { createdAt: { gte: period.from, lte: period.to } } : {}),
  };

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const [total, logs, users, actions] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { fullName: true, username: true } } },
    }),
    db.user.findMany({ select: { id: true, fullName: true, username: true }, orderBy: { fullName: "asc" } }),
    db.auditLog.groupBy({ by: ["action"], orderBy: { action: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    for (const key of ["actorId", "action", "from", "to"]) {
      const value = params[key];
      if (value) sp.set(key, value);
    }
    sp.set("page", String(p));
    return `/admin/audit?${sp.toString()}`;
  }

  const selectClass = "h-9 w-56 rounded-md border bg-transparent px-3 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Audit jurnali</h1>
        <span className="text-sm text-muted-foreground">Jami yozuvlar: {total}</span>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="actorId" className="text-xs text-muted-foreground">
            Foydalanuvchi
          </label>
          <select id="actorId" name="actorId" defaultValue={params.actorId ?? ""} className={selectClass}>
            <option value="">Barchasi</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.username})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="action" className="text-xs text-muted-foreground">
            Harakat
          </label>
          <select id="action" name="action" defaultValue={params.action ?? ""} className={selectClass}>
            <option value="">Barchasi</option>
            {actions.map((a) => (
              <option key={a.action} value={a.action}>
                {auditActionLabel(a.action)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="from" className="text-xs text-muted-foreground">
            Sana (dan)
          </label>
          <Input id="from" name="from" type="date" defaultValue={params.from ?? ""} className="w-40" />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="text-xs text-muted-foreground">
            Sana (gacha)
          </label>
          <Input id="to" name="to" type="date" defaultValue={params.to ?? ""} className="w-40" />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Filtrlash
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/audit">Tozalash</Link>
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vaqt</TableHead>
            <TableHead>Foydalanuvchi</TableHead>
            <TableHead>Harakat</TableHead>
            <TableHead>Obyekt</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Tafsilot</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const failedUsername =
              !log.actor && log.meta && typeof log.meta === "object" && "username" in log.meta
                ? String((log.meta as { username: unknown }).username)
                : null;
            return (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-sm">{formatDateTime(log.createdAt)}</TableCell>
                <TableCell className="text-sm">
                  {log.actor ? (
                    <>
                      {log.actor.fullName} <span className="text-muted-foreground">({log.actor.username})</span>
                    </>
                  ) : failedUsername ? (
                    <span className="text-muted-foreground">noma&apos;lum: {failedUsername}</span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  <div>{auditActionLabel(log.action)}</div>
                  <div className="font-mono text-xs text-muted-foreground">{log.action}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {log.entity && log.entityId ? (
                    log.entity === "Task" ? (
                      <Link href={`/tasks/${log.entityId}`} className="text-primary hover:underline">
                        Task
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{log.entity}</span>
                    )
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{log.ip ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground" title={JSON.stringify(log.meta)}>
                  {metaSummary(log.meta)}
                </TableCell>
              </TableRow>
            );
          })}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Yozuvlar topilmadi
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
            <PaginationItem>
              <span className="px-3 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href={pageHref(Math.min(totalPages, page + 1))} aria-disabled={page === totalPages} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
