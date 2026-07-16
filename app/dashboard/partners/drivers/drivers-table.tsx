'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Stars } from '@/app/components/ui/detail'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import { getDrivers, approveDriver, suspendDriver } from '@/app/actions/drivers'
import type { DriverSummary, Pagination } from '@/app/lib/types'

type DStatus = DriverSummary['status']

const STATUS_STYLES: Record<DStatus, string> = {
  ONLINE:      'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  OFFLINE:     'bg-slate-100 text-slate-600 ring-slate-500/20',
  BUSY:        'bg-amber-50 text-amber-700 ring-amber-600/20',
  ON_DELIVERY: 'bg-sky-50 text-sky-700 ring-sky-600/20',
}

const STATUS_DOT: Record<DStatus, string> = {
  ONLINE:      'bg-emerald-500',
  OFFLINE:     'bg-slate-400',
  BUSY:        'bg-amber-400',
  ON_DELIVERY: 'bg-sky-500',
}

export function DriversTable({
  initialDrivers,
  initialPagination,
}: {
  initialDrivers: DriverSummary[]
  initialPagination: Pagination
}) {
  const router = useRouter()
  const toast = useToast()
  const [drivers, setDrivers] = useState(initialDrivers)
  const [pagination, setPagination] = useState(initialPagination)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<DStatus | ''>('')
  const [isVerified, setIsVerified] = useState<'true' | 'false' | ''>('')
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function refetch(opts: {
    search?: string
    status?: DStatus | ''
    isVerified?: 'true' | 'false' | ''
    page?: number
  }) {
    const s = opts.search ?? search
    const st = opts.status !== undefined ? opts.status : status
    const iv = opts.isVerified !== undefined ? opts.isVerified : isVerified
    const pg = opts.page ?? 1
    startTransition(async () => {
      const res = await getDrivers({
        search: s || undefined,
        status: st || undefined,
        isVerified: iv || undefined,
        page: pg,
        limit: 20,
      })
      setDrivers(res.drivers)
      setPagination(res.pagination)
    })
  }

  function onSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearch(val)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => refetch({ search: val }), 400)
  }

  function onStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as DStatus | ''
    setStatus(val)
    refetch({ status: val })
  }

  function onIsVerified(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as 'true' | 'false' | ''
    setIsVerified(val)
    refetch({ isVerified: val })
  }

  function patchDriver(id: string, patch: Partial<DriverSummary>) {
    setDrivers((prev) => prev.map((d) => d.id === id ? { ...d, ...patch } : d))
  }

  function handleApprove(e: React.MouseEvent, driver: DriverSummary) {
    e.stopPropagation()
    startTransition(async () => {
      const res = await approveDriver(driver.id)
      if (res.error) { toast.error(res.error); return }
      patchDriver(driver.id, { isVerified: true })
      toast.success('Driver approved.')
    })
  }

  function handleSuspend(e: React.MouseEvent, driver: DriverSummary) {
    e.stopPropagation()
    startTransition(async () => {
      const res = await suspendDriver(driver.id, 'Suspended by admin')
      if (res.error) { toast.error(res.error); return }
      patchDriver(driver.id, { isVerified: false })
      toast.success('Driver suspended.')
    })
  }

  function navToDetail(driver: DriverSummary) {
    const q = new URLSearchParams({ name: driver.fullName, email: driver.email, phone: driver.phone })
    router.push(`/dashboard/partners/drivers/${driver.id}?${q}`)
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
          <p className="mt-0.5 text-sm text-slate-500">{pagination.total} drivers on the platform.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/partners/drivers/create')}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Create Driver
        </button>
      </div>

      <div className="mb-5 flex items-center gap-2.5 flex-wrap">
        {/* Search */}
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={onSearch}
            placeholder="Search name, email, phone…"
            className="h-9 rounded-xl border-0 bg-white pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none w-56"
          />
          {isPending && (
            <svg className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
        {/* Status */}
        <select value={status} onChange={onStatus} disabled={isPending}
          className="h-9 rounded-xl border-0 bg-white px-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60">
          <option value="">All statuses</option>
          <option value="ONLINE">Online</option>
          <option value="OFFLINE">Offline</option>
          <option value="BUSY">Busy</option>
          <option value="ON_DELIVERY">On Delivery</option>
        </select>
        {/* Verified */}
        <select value={isVerified} onChange={onIsVerified} disabled={isPending}
          className="h-9 rounded-xl border-0 bg-white px-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60">
          <option value="">All drivers</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">No drivers found</p>
            <p className="mt-0.5 text-xs text-slate-400">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Driver</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Vehicle</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Plate</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Verified</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Deliveries</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Rating</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {drivers.map((driver) => (
                  <tr
                    key={driver.id}
                    onClick={() => navToDetail(driver)}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{driver.fullName}</p>
                      <p className="text-xs text-slate-400">{driver.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {[driver.vehicleBrand, driver.vehicleModel, driver.vehicleType].filter(Boolean).join(' ')}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{driver.vehiclePlate ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[driver.status])}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[driver.status])} />
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {driver.isVerified
                        ? <span className="text-xs font-medium text-emerald-600">Verified</span>
                        : <span className="text-xs text-slate-400">Unverified</span>}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">{driver.totalDeliveries.toLocaleString()}</td>
                    <td className="px-5 py-3.5"><Stars rating={driver.rating} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {!driver.isVerified && (
                          <Button size="sm" loading={isPending} onClick={(e) => handleApprove(e, driver)} className="h-7 px-2.5 text-xs">Approve</Button>
                        )}
                        {driver.isVerified && (
                          <Button variant="secondary" size="sm" loading={isPending} onClick={(e) => handleSuspend(e, driver)} className="h-7 px-2.5 text-xs">Suspend</Button>
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

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {pagination.page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => refetch({ page: pagination.page - 1 })}
              disabled={pagination.page <= 1 || isPending}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pagination.page <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100')}
            >
              Previous
            </button>
            <button
              onClick={() => refetch({ page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages || isPending}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pagination.page >= pagination.totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100')}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
