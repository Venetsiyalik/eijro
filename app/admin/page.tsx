import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminHomePage() {
  const [userCount, orgCount, deptCount, taskCount] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.organization.count({ where: { isActive: true } }),
    db.department.count({ where: { isActive: true } }),
    db.task.count({ where: { isDeleted: false } }),
  ]);

  const stats = [
    { label: "Faol foydalanuvchilar", value: userCount },
    { label: "Tashkilotlar", value: orgCount },
    { label: "Bo'limlar", value: deptCount },
    { label: "Topshiriqlar", value: taskCount },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Admin bosh sahifa</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
