import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/layout/site-header";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader fullName={user.fullName} role={user.role} />
      <div className="flex flex-1">
        <AdminNav />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
