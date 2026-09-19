import { requireUser } from "@/lib/current-user";
import { refreshAndCountUnread } from "@/lib/notify";
import { SiteHeader } from "@/components/layout/site-header";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unreadCount = await refreshAndCountUnread(user.id);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader fullName={user.fullName} role={user.role} unreadCount={unreadCount} />
      <main className="flex-1 min-w-0 p-4 sm:p-6">{children}</main>
    </div>
  );
}
