"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import type { Priority, TaskStatus } from "@prisma/client";

type Option = { id: string; label: string };

export function TaskFilters({
  departments,
  assignees,
  showDepartmentFilter,
  showAssigneeFilter,
  showDeletedFilter = false,
}: {
  departments: Option[];
  assignees: Option[];
  showDepartmentFilter: boolean;
  showAssigneeFilter: boolean;
  showDeletedFilter?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "__all__") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const status = searchParams.get("status") ?? "__all__";
  const deadlineFilter = searchParams.get("deadlineFilter") ?? "__all__";
  const priority = searchParams.get("priority") ?? "__all__";
  const departmentId = searchParams.get("departmentId") ?? "__all__";
  const assigneeId = searchParams.get("assigneeId") ?? "__all__";
  const deleted = searchParams.get("deleted") ?? "__all__";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  const hasFilters = [status, deadlineFilter, priority, departmentId, assigneeId, deleted].some((v) => v !== "__all__") || dateFrom || dateTo;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Holat</label>
        <Select value={status} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Barchasi</SelectItem>
            {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Muddat</label>
        <Select value={deadlineFilter} onValueChange={(v) => setParam("deadlineFilter", v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Barchasi</SelectItem>
            <SelectItem value="OVERDUE">Muddati o&apos;tgan</SelectItem>
            <SelectItem value="DUE_SOON">Yaqinlashayotgan</SelectItem>
            <SelectItem value="ON_TRACK">Jarayonda</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Ustuvorlik</label>
        <Select value={priority} onValueChange={(v) => setParam("priority", v)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Barchasi</SelectItem>
            {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showDeletedFilter && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">O&apos;chirilganlik</label>
          <Select value={deleted} onValueChange={(v) => setParam("deleted", v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Barchasi</SelectItem>
              <SelectItem value="active">Faqat faol</SelectItem>
              <SelectItem value="deleted">Faqat o&apos;chirilgan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {showDepartmentFilter && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Bo&apos;lim</label>
          <Select value={departmentId} onValueChange={(v) => setParam("departmentId", v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Barchasi</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showAssigneeFilter && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Ijrochi</label>
          <Select value={assigneeId} onValueChange={(v) => setParam("assigneeId", v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Barchasi</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Muddat (dan)</label>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setParam("dateFrom", e.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Muddat (gacha)</label>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setParam("dateTo", e.target.value)}
          className="w-40"
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Tozalash
        </Button>
      )}
    </div>
  );
}
