import { Skeleton } from "@/components/ui/skeleton";

/** Sahifa yuklanayotganda ko'rsatiladigan umumiy skelet (loading.tsx uchun). */
export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Yuklanmoqda">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
