import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { ROLE_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

/** §7: profil va parolni o'zgartirish. Parol hashi va maxfiy maydonlar klientga chiqmaydi (select bilan cheklangan). */
export default async function ProfilePage() {
  const current = await requireUser();

  const user = await db.user.findUniqueOrThrow({
    where: { id: current.id },
    select: {
      fullName: true,
      username: true,
      position: true,
      phone: true,
      email: true,
      role: true,
      lastLoginAt: true,
      organization: { select: { name: true } },
      department: { select: { name: true } },
    },
  });

  const rows: [string, string][] = [
    ["F.I.Sh", user.fullName],
    ["Login", user.username],
    ["Rol", ROLE_LABELS[user.role]],
    ["Lavozim", user.position ?? "—"],
    ["Tashkilot", user.organization?.name ?? "—"],
    ["Bo'lim", user.department?.name ?? "—"],
    ["Telefon", user.phone ?? "—"],
    ["Email", user.email ?? "—"],
    ["Oxirgi kirish", user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"],
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Profil</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ma&apos;lumotlarim</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium break-words min-w-0">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Ma&apos;lumotlarni o&apos;zgartirish uchun administratorga murojaat qiling.
            </p>
          </CardContent>
        </Card>

        <ChangePasswordForm forced={false} />
      </div>
    </div>
  );
}
