import { Skeleton } from '@/components/dashboard/dashboard-ui';

/**
 * Shown while a dashboard route segment loads. The shape mirrors the pages'
 * common layout — heading, a row of cards, a table — so the transition does not
 * jump when the real content arrives.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>

      <Skeleton className="h-64 w-full" />
    </div>
  );
}
