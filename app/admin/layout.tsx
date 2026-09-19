import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { refreshAndCountUnread } from "@/lib/notify";
import { SiteHeader } from "@/components/layout/site-header";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  const unreadCount = await refreshAndCountUnread(user.id);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader fullName={user.fullName} role={user.role} unreadCount={unreadCount} />
      <div className="flex flex-1 flex-col md:flex-row">
        <AdminNav />
        <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
