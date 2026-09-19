"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { createDepartment, updateDepartment, type ActionState } from "@/actions/departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrgOption = { id: string; name: string };
type UserOption = { id: string; fullName: string; username: string; organizationId: string | null };

const initialState: ActionState = { error: null };

export function DepartmentFormDialog({
  mode,
  department,
  organizations,
  users,
}: {
  mode: "create" | "edit";
  department?: { id: string; name: string; organizationId: string; headId: string | null };
  organizations: OrgOption[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createDepartment : updateDepartment;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [organizationId, setOrganizationId] = useState(department?.organizationId ?? organizations[0]?.id ?? "");
  const [headId, setHeadId] = useState(department?.headId ?? "__none__");

  const headOptions = useMemo(
    () => users.filter((u) => u.organizationId === organizationId),
    [users, organizationId]
  );

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button size="sm">
            <Plus className="size-4" />
            Yangi bo&apos;lim
          </Button>
        ) : (
          <Button variant="ghost" size="icon" title="Tahrirlash">
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Yangi bo'lim" : "Bo'limni tahrirlash"}</DialogTitle>
          <DialogDescription>Bo&apos;lim nomi, tashkilot va boshliqni belgilang</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {mode === "edit" && department && <input type="hidden" name="id" value={department.id} />}
          <div className="space-y-2">
            <Label htmlFor="name">Nomi</Label>
            <Input id="name" name="name" defaultValue={department?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationId">Tashkilot</Label>
            <Select
              name="organizationId"
              value={organizationId}
              onValueChange={(v) => {
                setOrganizationId(v);
                setHeadId("__none__");
              }}
            >
              <SelectTrigger id="organizationId" className="w-full">
                <SelectValue placeholder="Tashkilotni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="headId">Bo&apos;lim boshlig&apos;i</Label>
            <Select name="headId" value={headId} onValueChange={setHeadId}>
              <SelectTrigger id="headId" className="w-full">
                <SelectValue placeholder="Belgilanmagan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Belgilanmagan</SelectItem>
                {headOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName} ({u.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
