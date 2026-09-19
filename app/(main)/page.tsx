import { requireUser } from "@/lib/current-user";
import { ExecutorDashboard } from "@/components/dashboard/executor-dashboard";
import { ManagementDashboard } from "@/components/dashboard/management-dashboard";

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === "EXECUTOR") return <ExecutorDashboard user={user} />;
  return <ManagementDashboard user={user} />;
}
