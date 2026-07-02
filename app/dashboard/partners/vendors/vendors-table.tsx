'use client'

import Image from 'next/image'
import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/lib/utils'
import { getVendors, approveVendor, rejectVendor, suspendVendor } from '@/app/actions/vendors'
import type { VendorSummary, VendorStore, Pagination } from '@/app/lib/types'

type VStatus = VendorSummary['verificationStatus']
type SStatus = VendorStore['status']

const STATUS_STYLES: Record<VStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-700 ring-amber-600/20',
  VERIFIED:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REJECTED:  'bg-red-50 text-red-700 ring-red-600/20',
  SUSPENDED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

const STATUS_DOT: Record<VStatus, string> = {
  PENDING:   'bg-amber-400',
  VERIFIED:  'bg-emerald-500',
  REJECTED:  'bg-red-500',
  SUSPENDED: 'bg-slate-400',
}

const STORE_STATUS_STYLES: Record<SStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-700',
  ACTIVE:    'bg-emerald-50 text-emerald-700',
  SUSPENDED: 'bg-slate-100 text-slate-500',
  CLOSED_PERMANENTLY: 'bg-red-50 text-red-600',
}

const FILTERS: { label: string; value: VStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Verified', value: 'VERIFIED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Suspended', value: 'SUSPENDED' },
]

function StoreLogo({ logo, name }: { logo: string | null; name: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  if (logo) {
    return (
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
        <Image src={logo} alt={name} fill className="object-cover" unoptimized />
      </div>
    )
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
      {initials}
    </div>
  )
}

export function VendorsTable({
  initialVendors,
  initialPagination,
}: {
  initialVendors: VendorSummary[]
  initialPagination: Pagination
}) {
  const router = useRouter()
  const [vendors, setVendors] = useState(initialVendors)
  const [pagination, setPagination] = useState(initialPagination)
  const [filter, setFilter] = useState<VStatus | ''>('')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function refetch(opts: { search?: string; verificationStatus?: VStatus | ''; page?: number }) {
    const s = opts.search ?? search
    const vs = opts.verificationStatus !== undefined ? opts.verificationStatus : filter
    const pg = opts.page ?? 1
    startTransition(async () => {
      const res = await getVendors({ search: s || undefined, verificationStatus: vs || undefined, page: pg, limit: 20 })
      setVendors(res.vendors)
      setPagination(res.pagination)
    })
  }

  function onSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearch(val)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => refetch({ search: val }), 400)
  }

  function onFilter(val: VStatus | '') {
    setFilter(val)
    refetch({ verificationStatus: val })
  }

  function patchVendor(id: string, patch: Partial<VendorSummary>) {
    setVendors((prev) => prev.map((v) => v.id === id ? { ...v, ...patch } : v))
  }

  function handleApprove(e: React.MouseEvent, vendor: VendorSummary) {
    e.stopPropagation()
    startTransition(async () => {
      const res = await approveVendor(vendor.id)
      if (!res.error) patchVendor(vendor.id, { verificationStatus: 'VERIFIED', isVerified: true })
    })
  }

  function handleReject(e: React.MouseEvent, vendor: VendorSummary) {
    e.stopPropagation()
    startTransition(async () => {
      const res = await rejectVendor(vendor.id)
      if (!res.error) patchVendor(vendor.id, { verificationStatus: 'REJECTED' })
    })
  }

  function handleSuspend(e: React.MouseEvent, vendor: VendorSummary) {
    e.stopPropagation()
    startTransition(async () => {
      const res = await suspendVendor(vendor.id)
      if (!res.error) patchVendor(vendor.id, { verificationStatus: 'SUSPENDED' })
    })
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="mt-0.5 text-sm text-slate-500">{pagination.total} vendors registered on the platform.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/partners/vendors/create')}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Create Vendor
        </button>
      </div>

      <div className="mb-5 flex items-center gap-3 flex-wrap justify-between">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              disabled={isPending}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60',
                filter === f.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={onSearch}
            placeholder="Search name, email…"
            className="h-9 rounded-xl border-0 bg-white pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none w-52"
          />
          {isPending && (
            <svg className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">No vendors found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400 min-w-55">Business</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Type</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Email</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Verification</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Store</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Joined</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    onClick={() => router.push(`/dashboard/partners/vendors/${vendor.id}`)}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <StoreLogo logo={vendor.store?.logo ?? null} name={vendor.store?.name ?? vendor.businessName} />
                        <div>
                          <p className="font-medium text-slate-900">{vendor.store?.name ?? vendor.businessName}</p>
                          <p className="text-xs text-slate-400">{vendor.businessName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{vendor.businessType}</td>
                    <td className="px-5 py-3.5 text-slate-500">{vendor.businessEmail}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[vendor.verificationStatus])}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[vendor.verificationStatus])} />
                        {vendor.verificationStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {vendor.store ? (
                        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', STORE_STATUS_STYLES[vendor.store.status])}>
                          {vendor.store.status}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No store</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      {new Date(vendor.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {vendor.verificationStatus === 'PENDING' && (
                          <>
                            <Button size="sm" loading={isPending} onClick={(e) => handleApprove(e, vendor)} className="h-7 px-2.5 text-xs">Approve</Button>
                            <Button variant="danger" size="sm" loading={isPending} onClick={(e) => handleReject(e, vendor)} className="h-7 px-2.5 text-xs">Reject</Button>
                          </>
                        )}
                        {vendor.verificationStatus === 'VERIFIED' && (
                          <Button variant="secondary" size="sm" loading={isPending} onClick={(e) => handleSuspend(e, vendor)} className="h-7 px-2.5 text-xs">Suspend</Button>
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
