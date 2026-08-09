import { Skeleton } from '@/app/components/ui/skeleton'

export default function VendorDetailLoading() {
  return (
    <div className="min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-4">
        <Skeleton className="mb-3 h-4 w-16" />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-56" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-8 w-24 rounded-xl" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        </div>
        <div className="mt-4 flex gap-6">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Store banner hero */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-52 w-full rounded-none" />
          <div className="px-6 pt-14 pb-3 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 pb-5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4"><Skeleton className="h-4 w-40" /></div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-3.5 w-28" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4"><Skeleton className="h-4 w-20" /></div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4"><Skeleton className="h-4 w-16" /></div>
              <div className="space-y-4 px-6 py-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-3.5 w-28" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4"><Skeleton className="h-4 w-12" /></div>
              <div className="px-6 py-5">
                <Skeleton className="h-3.5 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
