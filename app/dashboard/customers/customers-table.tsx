'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/app/lib/utils'
import { getCustomers } from '@/app/actions/customers'
import type { CustomerSummary, UserStatus, Pagination } from '@/app/lib/types'

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE:               'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  PENDING_VERIFICATION: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  SUSPENDED:            'bg-orange-50 text-orange-700 ring-orange-600/20',
  BANNED:               'bg-red-50 text-red-700 ring-red-600/20',
  DEACTIVATED:          'bg-slate-100 text-slate-500 ring-slate-200',
}

const STATUS_DOT: Record<UserStatus, string> = {
  ACTIVE:               'bg-emerald-500',
  PENDING_VERIFICATION: 'bg-amber-400',
  SUSPENDED:            'bg-orange-500',
  BANNED:               'bg-red-500',
  DEACTIVATED:          'bg-slate-400',
}

function formatStatus(s: UserStatus) {
  return s === 'PENDING_VERIFICATION' ? 'Pending' : s.charAt(0) + s.slice(1).toLowerCase()
}

export function CustomersTable({ initialCustomers, initialPagination }: { initialCustomers: CustomerSummary[]; initialPagination: Pagination }) {
  const router = useRouter()
  const [customers, setCustomers] = useState(initialCustomers)
  const [pagination, setPagination] = useState(initialPagination)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function refetch(opts: { search?: string; status?: UserStatus | ''; page?: number }) {
    const s = opts.search ?? search
    const st = opts.status !== undefined ? opts.status : status
    const pg = opts.page ?? 1
    startTransition(async () => {
      const res = await getCustomers({ search: s || undefined, status: st || undefined, page: pg, limit: 50 })
      setCustomers(res.customers)
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
    const val = e.target.value as UserStatus | ''
    setStatus(val)
    refetch({ status: val })
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-0.5 text-sm text-slate-500">{pagination.total} customers registered.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
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
          <div className="relative">
            <select value={status} onChange={onStatus}
              className="h-9 appearance-none rounded-xl border-0 bg-white pl-3.5 pr-9 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_VERIFICATION">Pending verification</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">No customers found</p>
            <p className="mt-0.5 text-xs text-slate-400">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Customer</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Phone</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Verified</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Provider</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customers.map((c) => {
                  const initials = `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase()
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/dashboard/customers/${c.id}`)}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{initials}</div>
                          <div>
                            <p className="font-medium text-slate-900">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-slate-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{c.phone}</td>
                      <td className="px-5 py-3.5">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[c.status])}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[c.status])} />
                          {formatStatus(c.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs font-medium', c.emailVerified ? 'text-emerald-600' : 'text-slate-400')}>Email {c.emailVerified ? '✓' : '✗'}</span>
                          <span className={cn('text-xs font-medium', c.phoneVerified ? 'text-emerald-600' : 'text-slate-400')}>Phone {c.phoneVerified ? '✓' : '✗'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{c.authProvider}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {c.lastLoginAt
                          ? new Date(c.lastLoginAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
