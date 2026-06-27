'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/app/lib/utils'
import { formatNaira } from '@/app/lib/utils'
import { getRides } from '@/app/actions/rides'
import type { RideSummary, RideStatus, Pagination } from '@/app/lib/types'

const STATUS_STYLES: Record<RideStatus, string> = {
  REQUESTED:             'bg-amber-50 text-amber-700 ring-amber-600/20',
  SEARCHING_DRIVER:      'bg-amber-50 text-amber-700 ring-amber-600/20',
  DRIVER_ASSIGNED:       'bg-sky-50 text-sky-700 ring-sky-600/20',
  DRIVER_ACCEPTED:       'bg-sky-50 text-sky-700 ring-sky-600/20',
  PAID:                  'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  IN_PROGRESS:           'bg-blue-50 text-blue-700 ring-blue-600/20',
  COMPLETED:             'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  SCHEDULED:             'bg-violet-50 text-violet-700 ring-violet-600/20',
  DRIVER_ASSIGNED_SCHED: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  CANCELLED_BY_USER:     'bg-red-50 text-red-700 ring-red-600/20',
  CANCELLED_BY_DRIVER:   'bg-red-50 text-red-700 ring-red-600/20',
  CANCELLED_BY_SYSTEM:   'bg-red-50 text-red-700 ring-red-600/20',
  CANCELLED_SCHEDULED:   'bg-orange-50 text-orange-700 ring-orange-600/20',
  PENDING:               'bg-amber-50 text-amber-700 ring-amber-600/20',
  ACCEPTED:              'bg-sky-50 text-sky-700 ring-sky-600/20',
  ARRIVED:               'bg-blue-50 text-blue-700 ring-blue-600/20',
  CANCELLED:             'bg-red-50 text-red-700 ring-red-600/20',
}

const STATUS_DOT: Record<RideStatus, string> = {
  REQUESTED:             'bg-amber-400',
  SEARCHING_DRIVER:      'bg-amber-400',
  DRIVER_ASSIGNED:       'bg-sky-400',
  DRIVER_ACCEPTED:       'bg-sky-500',
  PAID:                  'bg-indigo-500',
  IN_PROGRESS:           'bg-blue-500',
  COMPLETED:             'bg-emerald-500',
  SCHEDULED:             'bg-violet-500',
  DRIVER_ASSIGNED_SCHED: 'bg-violet-500',
  CANCELLED_BY_USER:     'bg-red-500',
  CANCELLED_BY_DRIVER:   'bg-red-500',
  CANCELLED_BY_SYSTEM:   'bg-red-500',
  CANCELLED_SCHEDULED:   'bg-orange-500',
  PENDING:               'bg-amber-400',
  ACCEPTED:              'bg-sky-400',
  ARRIVED:               'bg-blue-500',
  CANCELLED:             'bg-red-500',
}

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function RidesTable({
  initialRides,
  initialPagination,
}: {
  initialRides: RideSummary[]
  initialPagination: Pagination
}) {
  const router = useRouter()
  const [rides, setRides] = useState(initialRides)
  const [pagination, setPagination] = useState(initialPagination)
  const [status, setStatus] = useState<RideStatus | ''>('')
  const [isPending, startTransition] = useTransition()

  function refetch(opts?: { status?: RideStatus | ''; page?: number }) {
    const st = opts?.status !== undefined ? opts.status : status
    const pg = opts?.page ?? 1
    startTransition(async () => {
      const res = await getRides({ status: st || undefined, page: pg, limit: 20 })
      setRides(res.rides)
      setPagination(res.pagination)
    })
  }

  function onStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as RideStatus | ''
    setStatus(val)
    refetch({ status: val })
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rides</h1>
          <p className="mt-0.5 text-sm text-slate-500">{pagination.total} rides found.</p>
        </div>
        {isPending && (
          <svg className="h-4 w-4 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {/* Status filter */}
      <div className="mb-5">
        <select
          value={status}
          onChange={onStatusChange}
          disabled={isPending}
          className="h-9 rounded-xl border-0 bg-white px-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60"
        >
          <option value="">All statuses</option>
          <optgroup label="Active">
            <option value="PENDING">Pending</option>
            <option value="REQUESTED">Requested</option>
            <option value="SEARCHING_DRIVER">Searching Driver</option>
            <option value="ACCEPTED">Accepted</option>
          </optgroup>
          <optgroup label="Assigned">
            <option value="DRIVER_ASSIGNED">Driver Assigned</option>
            <option value="DRIVER_ACCEPTED">Driver Accepted</option>
            <option value="ARRIVED">Arrived</option>
          </optgroup>
          <optgroup label="In Progress">
            <option value="PAID">Paid</option>
            <option value="IN_PROGRESS">In Progress</option>
          </optgroup>
          <optgroup label="Scheduled">
            <option value="SCHEDULED">Scheduled</option>
            <option value="DRIVER_ASSIGNED_SCHED">Scheduled (Driver Assigned)</option>
          </optgroup>
          <optgroup label="Completed">
            <option value="COMPLETED">Completed</option>
          </optgroup>
          <optgroup label="Cancelled">
            <option value="CANCELLED">Cancelled</option>
            <option value="CANCELLED_BY_USER">Cancelled by User</option>
            <option value="CANCELLED_BY_DRIVER">Cancelled by Driver</option>
            <option value="CANCELLED_BY_SYSTEM">Cancelled by System</option>
            <option value="CANCELLED_SCHEDULED">Cancelled (Scheduled)</option>
          </optgroup>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {rides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-slate-700">No rides found</p>
            <p className="mt-0.5 text-xs text-slate-400">Try adjusting the status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Tracking ID</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Route</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Fare</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Vehicle</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Driver</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rides.map((ride) => (
                  <tr
                    key={ride.id}
                    onClick={() => router.push(`/dashboard/rides/${ride.id}`)}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs font-medium text-slate-900">{ride.trackingId}</p>
                      {ride.isScheduled && (
                        <span className="mt-0.5 inline-flex items-center rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">Scheduled</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[ride.status])}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[ride.status])} />
                        {formatStatus(ride.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-[220px]">
                      <p className="truncate text-xs text-slate-700">
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-700 mr-1">A</span>
                        {ride.pickupAddress.address || ride.pickupAddress.street}
                      </p>
                      <p className="truncate text-xs text-slate-400 mt-0.5">
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100 text-[9px] font-bold text-red-600 mr-1">B</span>
                        {ride.dropoffAddress.address || ride.dropoffAddress.street}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">{formatNaira(ride.fare)}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{ride.vehicleType}</td>
                    <td className="px-5 py-3.5 text-xs">
                      {ride.driver
                        ? <span className="text-slate-700 font-medium">{ride.driver.name}</span>
                        : <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(ride.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => refetch({ page: pagination.page - 1 })}
              disabled={pagination.page <= 1 || isPending}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pagination.page <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              Previous
            </button>
            <button
              onClick={() => refetch({ page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages || isPending}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pagination.page >= pagination.totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
