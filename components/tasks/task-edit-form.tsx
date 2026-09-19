"use client";

import { useActionState, useMemo, useState } from "react";
import { updateTask, type ActionState } from "@/actions/task-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITY_LABELS } from "@/lib/labels";
import type { Priority } from "@prisma/client";

type AssignableUser = {
  id: string;
  fullName: string;
  username: string;
  departmentName: string | null;
};

const initialState: ActionState = { error: null };

export function TaskEditForm({
  task,
  canEditAssignees,
  users,
  currentAssigneeIds,
}: {
  task: { id: string; title: string; description: string; priority: Priority; deadlineInput: string };
  canEditAssignees: boolean;
  users: AssignableUser[];
  currentAssigneeIds: string[];
}) {
  const [state, formAction, isPending] = useActionState(updateTask, initialState);
  const [deadline, setDeadline] = useState(task.deadlineInput);
  const [selected, setSelected] = useState<string[]>(currentAssigneeIds);
  const deadlineChanged = deadline !== task.deadlineInput;

  const grouped = useMemo(() => {
    const map = new Map<string, AssignableUser[]>();
    for (const u of users) {
      const key = u.departmentName ?? "Bo'limsiz";
      map.set(key, [...(map.get(key) ?? []), u]);
    }
    return Array.from(map.entries());
  }, [users]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="taskId" value={task.id} />

      <div className="space-y-2">
        <Label htmlFor="title">Sarlavha</Label>
        <Input id="title" name="title" defaultValue={task.title} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Tavsif</Label>
        <Textarea id="description" name="description" rows={4} defaultValue={task.description} required />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="priority">Ustuvorlik</Label>
          <Select name="priority" defaultValue={task.priority}>
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
          <Input
            id="deadline"
            name="deadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">
          Muddatni o&apos;zgartirish sababi {deadlineChanged ? <span className="text-destructive">(majburiy)</span> : "(muddat o'zgarsa majburiy)"}
        </Label>
        <Textarea id="reason" name="reason" rows={2} required={deadlineChanged} />
      </div>

      {canEditAssignees && (
        <div className="space-y-2">
          <Label>Ijrochilar</Label>
          <div className="rounded-md border p-3 max-h-64 overflow-y-auto space-y-4">
            {grouped.map(([dept, list]) => (
              <div key={dept} className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">{dept}</div>
                {list.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selected.includes(u.id)}
                      onCheckedChange={(checked) =>
                        setSelected((prev) => (checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)))
                      }
                    />
                    {selected.includes(u.id) && <input type="hidden" name="assigneeIds" value={u.id} />}
                    <span>
                      {u.fullName} <span className="text-muted-foreground">({u.username})</span>
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saqlanmoqda..." : "Saqlash"}
      </Button>
    </form>
  );
}
