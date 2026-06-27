'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Stars } from '@/app/components/ui/detail'
import { cn } from '@/app/lib/utils'
import { approveRider, suspendRider } from '@/app/actions/riders'
import type { RiderSummary } from '@/app/lib/types'

type RStatus = RiderSummary['status']

const STATUS_STYLES: Record<RStatus, string> = {
  ONLINE:    'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  OFFLINE:   'bg-slate-100 text-slate-600 ring-slate-500/20',
  BUSY:      'bg-amber-50 text-amber-700 ring-amber-600/20',
  SUSPENDED: 'bg-red-50 text-red-700 ring-red-600/20',
}

const STATUS_DOT: Record<RStatus, string> = {
  ONLINE:    'bg-emerald-500',
  OFFLINE:   'bg-slate-400',
  BUSY:      'bg-amber-400',
  SUSPENDED: 'bg-red-500',
}

export function RidersTable({
  initialRiders,
  total,
}: {
  initialRiders: RiderSummary[]
  total: number
}) {
  const router = useRouter()
  const [riders, setRiders] = useState(initialRiders)
  const [isPending, startTransition] = useTransition()

  function patchRider(id: string, patch: Partial<RiderSummary>) {
    setRiders((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r))
  }

  function handleApprove(e: React.MouseEvent, rider: RiderSummary) {
    e.stopPropagation()
    startTransition(async () => {
      const res = await approveRider(rider.id)
      if (!res.error) patchRider(rider.id, { isVerified: true })
    })
  }

  function handleSuspend(e: React.MouseEvent, rider: RiderSummary) {
    e.stopPropagation()
    startTransition(async () => {
      const res = await suspendRider(rider.id, 'Suspended by admin')
      if (!res.error) patchRider(rider.id, { status: 'SUSPENDED' })
    })
  }

  function navToDetail(rider: RiderSummary) {
    const q = new URLSearchParams({ name: rider.fullName, email: rider.email, phone: rider.phone })
    router.push(`/dashboard/partners/riders/${rider.id}?${q}`)
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Riders</h1>
          <p className="mt-0.5 text-sm text-slate-500">{total} riders on the platform.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/partners/riders/create')}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Create Rider
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {riders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">No riders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Rider</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Vehicle</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Verified</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Deliveries</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Rating</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {riders.map((rider) => (
                  <tr
                    key={rider.id}
                    onClick={() => navToDetail(rider)}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{rider.fullName}</p>
                      <p className="text-xs text-slate-400">{rider.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{rider.vehicleType}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[rider.status])}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[rider.status])} />
                        {rider.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {rider.isVerified
                        ? <span className="text-xs font-medium text-emerald-600">Verified</span>
                        : <span className="text-xs text-slate-400">Unverified</span>}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">{rider.totalDeliveries.toLocaleString()}</td>
                    <td className="px-5 py-3.5"><Stars rating={rider.rating} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {!rider.isVerified && rider.status !== 'SUSPENDED' && (
                          <Button size="sm" loading={isPending} onClick={(e) => handleApprove(e, rider)} className="h-7 px-2.5 text-xs">Approve</Button>
                        )}
                        {rider.status !== 'SUSPENDED' && (
                          <Button variant="secondary" size="sm" loading={isPending} onClick={(e) => handleSuspend(e, rider)} className="h-7 px-2.5 text-xs">Suspend</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
