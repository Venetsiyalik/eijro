import { db } from "@/lib/db";
import { UsersTable } from "@/components/admin/users-table";

export default async function UsersPage() {
  const [users, organizations, departments] = await Promise.all([
    db.user.findMany({
      include: { department: true },
      orderBy: { fullName: "asc" },
    }),
    db.organization.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const rows = users.map((u) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    position: u.position,
    phone: u.phone,
    email: u.email,
    role: u.role,
    organizationId: u.organizationId,
    departmentId: u.departmentId,
    departmentName: u.department?.name ?? null,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Foydalanuvchilar</h1>
      <UsersTable users={rows} organizations={organizations} departments={departments} />
    </div>
  );
}
