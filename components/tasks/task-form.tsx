"use client";

import { useActionState, useMemo, useState } from "react";
import { createTask, type ActionState } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_LABELS } from "@/lib/labels";
import type { Priority } from "@prisma/client";

type AssignableUser = {
  id: string;
  fullName: string;
  username: string;
  departmentId: string | null;
  department: { name: string } | null;
};

type DeptOption = { id: string; name: string };

const initialState: ActionState = { error: null };

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TaskForm({
  assignableUsers,
  departments,
  isManagerRole,
  defaultDepartmentId,
}: {
  assignableUsers: AssignableUser[];
  departments: DeptOption[];
  isManagerRole: boolean;
  defaultDepartmentId: string | null;
}) {
  const [state, formAction, isPending] = useActionState(createTask, initialState);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId ?? "__none__");

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; users: AssignableUser[] }>();
    for (const u of assignableUsers) {
      const key = u.departmentId ?? "__no_dept__";
      const label = u.department?.name ?? "Bo'limsiz";
      if (!map.has(key)) map.set(key, { label, users: [] });
      map.get(key)!.users.push(u);
    }
    return Array.from(map.values());
  }, [assignableUsers]);

  const minDeadline = toLocalDatetimeValue(new Date(Date.now() + 60 * 1000));

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Sarlavha</Label>
        <Input id="title" name="title" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Tavsif</Label>
        <Textarea id="description" name="description" rows={4} required />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="priority">Ustuvorlik</Label>
          <Select name="priority" defaultValue="MEDIUM">
            <SelectTrigger id="priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadline">Muddat</Label>
          <Input id="deadline" name="deadline" type="datetime-local" min={minDeadline} required />
        </div>
      </div>

      {!isManagerRole && (
        <div className="space-y-2">
          <Label htmlFor="departmentId">Bo&apos;lim (hisobot uchun)</Label>
          <Select name="departmentId" value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger id="departmentId" className="w-full">
              <SelectValue placeholder="Tanlanmagan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Tanlanmagan</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Ijrochilar</Label>
        <div className="rounded-md border p-3 max-h-64 overflow-y-auto space-y-4">
          {grouped.length === 0 && <p className="text-sm text-muted-foreground">Ijrochilar topilmadi</p>}
          {grouped.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">{group.label}</div>
              {group.users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedAssignees.includes(u.id)}
                    onCheckedChange={(checked) => {
                      setSelectedAssignees((prev) =>
                        checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                      );
                    }}
                  />
                  {selectedAssignees.includes(u.id) && (
                    <input type="hidden" name="assigneeIds" value={u.id} />
                  )}
                  <span>
                    {u.fullName} <span className="text-muted-foreground">({u.username})</span>
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Yaratilmoqda..." : "Topshiriq yaratish"}
      </Button>
    </form>
  );
}
