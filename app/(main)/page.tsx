import { requireUser } from "@/lib/current-user";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Xush kelibsiz, {user.fullName}</h1>
      <p className="text-muted-foreground mt-1">Dashboard keyingi bosqichda to&apos;ldiriladi.</p>
    </div>
  );
}
