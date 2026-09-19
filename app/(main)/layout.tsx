import { requireUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/layout/site-header";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader fullName={user.fullName} role={user.role} />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
