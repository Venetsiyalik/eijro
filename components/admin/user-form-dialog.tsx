"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { createUser, updateUser, type UserActionState } from "@/actions/users";
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
import { GeneratedPasswordView } from "@/components/admin/generated-password-view";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@prisma/client";

type OrgOption = { id: string; name: string };
type DeptOption = { id: string; name: string; organizationId: string };

const initialState: UserActionState = { error: null };

export function UserFormDialog({
  mode,
  user,
  organizations,
  departments,
}: {
  mode: "create" | "edit";
  user?: {
    id: string;
    username: string;
    fullName: string;
    position: string | null;
    phone: string | null;
    email: string | null;
    role: Role;
    organizationId: string | null;
    departmentId: string | null;
  };
  organizations: OrgOption[];
  departments: DeptOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createUser : updateUser;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [organizationId, setOrganizationId] = useState(user?.organizationId ?? "__none__");
  const [departmentId, setDepartmentId] = useState(user?.departmentId ?? "__none__");

  const deptOptions = useMemo(
    () => departments.filter((d) => d.organizationId === organizationId),
    [departments, organizationId]
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  useEffect(() => {
    if (state.success) {
      router.refresh();
      if (!state.tempPassword) setOpen(false);
    }
  }, [state.success, state.tempPassword, router]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button size="sm">
            <Plus className="size-4" />
            Yangi foydalanuvchi
          </Button>
        ) : (
          <Button variant="ghost" size="icon" title="Tahrirlash">
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {state.success && state.tempPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Foydalanuvchi yaratildi</DialogTitle>
            </DialogHeader>
            <GeneratedPasswordView
              username={state.username ?? ""}
              password={state.tempPassword}
              onClose={() => setOpen(false)}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{mode === "create" ? "Yangi foydalanuvchi" : "Foydalanuvchini tahrirlash"}</DialogTitle>
              <DialogDescription>
                {mode === "create" ? "Vaqtinchalik parol avtomatik yaratiladi" : "Foydalanuvchi ma'lumotlarini yangilang"}
              </DialogDescription>
            </DialogHeader>
            <form action={formAction} className="space-y-4">
              {mode === "edit" && user && <input type="hidden" name="id" value={user.id} />}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Login</Label>
                  <Input id="username" name="username" defaultValue={user?.username} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">F.I.Sh</Label>
                  <Input id="fullName" name="fullName" defaultValue={user?.fullName} required />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="position">Lavozimi</Label>
                  <Input id="position" name="position" defaultValue={user?.position ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select name="role" defaultValue={user?.role ?? "EXECUTOR"}>
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" defaultValue={user?.phone ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={user?.email ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="organizationId">Tashkilot</Label>
                  <Select
                    name="organizationId"
                    value={organizationId}
                    onValueChange={(v) => {
                      setOrganizationId(v);
                      setDepartmentId("__none__");
                    }}
                  >
                    <SelectTrigger id="organizationId" className="w-full">
                      <SelectValue placeholder="Tanlanmagan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Tanlanmagan</SelectItem>
                      {organizations.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departmentId">Bo&apos;lim</Label>
                  <Select name="departmentId" value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger id="departmentId" className="w-full">
                      <SelectValue placeholder="Tanlanmagan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Tanlanmagan</SelectItem>
                      {deptOptions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
