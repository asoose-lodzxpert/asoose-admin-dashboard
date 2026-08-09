import { cn } from '@/app/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer rounded-md', className)} />
}

function HeaderSkeleton() {
  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-4">
      <Skeleton className="mb-3 h-4 w-20" />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-64" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </div>
      <div className="mt-5 flex gap-6">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="min-h-full">
      <HeaderSkeleton />
      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <CardSkeleton rows={6} />
            <CardSkeleton rows={4} />
          </div>
          <div className="space-y-6">
            <CardSkeleton rows={3} />
            <CardSkeleton rows={2} />
          </div>
        </div>
      </div>
    </div>
  )
}
