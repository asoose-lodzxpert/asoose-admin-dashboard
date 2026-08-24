'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getPropertyOwners } from '@/app/actions/property-owners'
import { Spinner } from '@/app/components/ui/spinner'
import { useRowNav } from '@/app/lib/hooks/use-row-nav'
import { cn } from '@/app/lib/utils'
import type { Pagination, PropertyOwnerSummary } from '@/app/lib/types'

type VerifiedFilter = '' | 'true' | 'false'

const FILTERS: { label: string; value: VerifiedFilter }[] = [
  { label: 'All', value: '' },
  { label: 'Verified', value: 'true' },
  { label: 'Unverified', value: 'false' },
]

const STATUS_STYLES: Record<PropertyOwnerSummary['verificationStatus'], string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  VERIFIED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REJECTED: 'bg-red-50 text-red-700 ring-red-600/20',
  SUSPENDED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export function PropertyOwnersTable({
  initialPropertyOwners,
  initialPagination,
}: {
  initialPropertyOwners: PropertyOwnerSummary[]
  initialPagination: Pagination
}) {
  const router = useRouter()
  const { navigatingId, navigate } = useRowNav()
  const [propertyOwners, setPropertyOwners] = useState(initialPropertyOwners)
  const [pagination, setPagination] = useState(initialPagination)
  const [filter, setFilter] = useState<VerifiedFilter>('')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function refetch(options: { search?: string; filter?: VerifiedFilter; page?: number }) {
    const nextSearch = options.search ?? search
    const nextFilter = options.filter ?? filter
    const page = options.page ?? 1

    startTransition(async () => {
      const result = await getPropertyOwners({
        page,
        limit: 20,
        search: nextSearch.trim() || undefined,
        isVerified: nextFilter === '' ? undefined : nextFilter === 'true',
      })
      setPropertyOwners(result.propertyOwners)
      setPagination(result.pagination)
    })
  }

  function handleSearch(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => refetch({ search: value }), 400)
  }

  function handleFilter(value: VerifiedFilter) {
    setFilter(value)
    refetch({ filter: value })
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Property Owners</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {pagination.total} property owners registered on the platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/partners/property-owners/create')}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <span className="text-lg leading-none">+</span>
          Create Property Owner
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={isPending}
              onClick={() => handleFilter(item.value)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60',
                filter === item.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={handleSearch}
            placeholder="Search owner or business…"
            className="h-9 w-64 rounded-xl border-0 bg-white pl-9 pr-9 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
          />
          {isPending && <Spinner className="absolute right-3 top-1/2 -translate-y-1/2" />}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {propertyOwners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">No property owners found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="min-w-60 px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Owner</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Business</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Location</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Verification</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Commission</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {propertyOwners.map((owner) => (
                  <tr
                    key={owner.id}
                    onClick={() => navigate(owner.id, `/dashboard/partners/property-owners/${owner.id}`)}
                    className={cn(
                      'cursor-pointer transition-opacity hover:bg-slate-50/80',
                      navigatingId === owner.id && 'pointer-events-none opacity-50'
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                          {initials(owner.fullName || owner.businessName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{owner.fullName}</p>
                          <p className="truncate text-xs text-slate-400">{owner.userEmail}</p>
                        </div>
                        {navigatingId === owner.id && <Spinner className="ml-1" />}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-700">{owner.businessName}</p>
                      <p className="text-xs text-slate-400">{owner.businessEmail}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {[owner.address.city, owner.address.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[owner.verificationStatus])}>
                        {owner.verificationStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {owner.customCommissionPercent == null ? 'Default' : `${owner.customCommissionPercent}%`}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      {new Date(owner.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
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
              type="button"
              disabled={pagination.page <= 1 || isPending}
              onClick={() => refetch({ page: pagination.page - 1 })}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || isPending}
              onClick={() => refetch({ page: pagination.page + 1 })}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
