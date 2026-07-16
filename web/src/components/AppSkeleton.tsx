import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/** Full-shell loading state shown while the session profile and orgs resolve. */
export function AppSkeleton() {
  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="hidden h-3 w-20 sm:block" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3.5 w-44" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[70px] rounded-xl" />
            ))}
          </div>
          <Card className="divide-y divide-slate-50 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
            ))}
          </Card>
        </div>
      </main>
    </div>
  );
}
