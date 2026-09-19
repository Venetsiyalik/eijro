"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";
import { ActiveToggleButton } from "@/components/admin/active-toggle-button";
import { toggleUserActive } from "@/actions/users";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@prisma/client";

type UserRow = {
  id: string;
  username: string;
  fullName: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  role: Role;
  organizationId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
};

type OrgOption = { id: string; name: string };
type DeptOption = { id: string; name: string; organizationId: string };

export function UsersTable({
  users,
  organizations,
  departments,
}: {
  users: UserRow[];
  organizations: OrgOption[];
  departments: DeptOption[];
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("__all__");
  const [departmentFilter, setDepartmentFilter] = useState("__all__");
  const [statusFilter, setStatusFilter] = useState("__all__");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.fullName.toLowerCase().includes(q) && !u.username.toLowerCase().includes(q)) return false;
      if (roleFilter !== "__all__" && u.role !== roleFilter) return false;
      if (departmentFilter !== "__all__" && u.departmentId !== departmentFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "blocked" && u.isActive) return false;
      return true;
    });
  }, [users, search, roleFilter, departmentFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Ism yoki login bo'yicha qidirish"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Barcha rollar</SelectItem>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Bo'lim" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Barcha bo&apos;limlar</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Holat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Barchasi</SelectItem>
            <SelectItem value="active">Faol</SelectItem>
            <SelectItem value="blocked">Bloklangan</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <UserFormDialog mode="create" organizations={organizations} departments={departments} />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>F.I.Sh</TableHead>
            <TableHead>Login</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Bo&apos;lim</TableHead>
            <TableHead>Holat</TableHead>
            <TableHead className="text-right">Amallar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">
                {u.fullName}
                {u.position && <div className="text-xs text-muted-foreground">{u.position}</div>}
              </TableCell>
              <TableCell className="font-mono text-sm">{u.username}</TableCell>
              <TableCell>{ROLE_LABELS[u.role]}</TableCell>
              <TableCell>{u.departmentName ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="space-x-1">
                {u.isActive ? <Badge variant="outline">Faol</Badge> : <Badge variant="destructive">Bloklangan</Badge>}
                {u.mustChangePassword && <Badge variant="secondary">Parol kutilmoqda</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <UserFormDialog mode="edit" user={u} organizations={organizations} departments={departments} />
                  <ResetPasswordDialog userId={u.id} username={u.username} />
                  <ActiveToggleButton id={u.id} isActive={u.isActive} toggleAction={toggleUserActive} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Foydalanuvchilar topilmadi
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
