import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DepartmentFormDialog } from "@/components/admin/department-form-dialog";
import { ActiveToggleButton } from "@/components/admin/active-toggle-button";
import { toggleDepartmentActive } from "@/actions/departments";

export default async function DepartmentsPage() {
  const [departments, organizations, users] = await Promise.all([
    db.department.findMany({
      include: { organization: true, head: true, _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    }),
    db.organization.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, username: true, organizationId: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bo&apos;limlar</h1>
        <DepartmentFormDialog mode="create" organizations={organizations} users={users} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nomi</TableHead>
            <TableHead>Tashkilot</TableHead>
            <TableHead>Boshliq</TableHead>
            <TableHead>A&apos;zolar</TableHead>
            <TableHead>Holat</TableHead>
            <TableHead className="text-right">Amallar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell>{d.organization.name}</TableCell>
              <TableCell>{d.head ? d.head.fullName : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>{d._count.members}</TableCell>
              <TableCell>
                {d.isActive ? <Badge variant="outline">Faol</Badge> : <Badge variant="secondary">Faol emas</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <DepartmentFormDialog mode="edit" department={d} organizations={organizations} users={users} />
                  <ActiveToggleButton id={d.id} isActive={d.isActive} toggleAction={toggleDepartmentActive} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {departments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Bo&apos;limlar mavjud emas
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
