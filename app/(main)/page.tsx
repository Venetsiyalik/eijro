import { Suspense } from "react";
import { requireUser } from "@/lib/current-user";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { ExecutorDashboard } from "@/components/dashboard/executor-dashboard";
import { ManagementDashboard } from "@/components/dashboard/management-dashboard";

// Skelet Suspense bilan (segment loading.tsx emas): HTTP status (403/404) o'zgarmasligi uchun.
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <Suspense fallback={<PageSkeleton />}>
      {user.role === "EXECUTOR" ? <ExecutorDashboard user={user} /> : <ManagementDashboard user={user} />}
    </Suspense>
  );
}
