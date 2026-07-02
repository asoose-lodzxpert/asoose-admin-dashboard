'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/app/lib/utils'
import { getCustomers, updateCustomerStatus } from '@/app/actions/customers'
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function Toast({ msg, ok, onDismiss }: { msg: string; ok: boolean; onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      className={cn(
        'fixed bottom-6 right-6 z-50 flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-lg',
        ok ? 'bg-emerald-600' : 'bg-red-600'
      )}
    >
      {ok ? '✓' : '✗'} {msg}
    </div>
  )
}

interface InitialParams {
  search?: string
  status?: string
  page?: string
}

export function CustomersTable({
  initialCustomers,
  initialPagination,
  initialParams = {},
}: {
  initialCustomers: CustomerSummary[]
  initialPagination: Pagination
  initialParams?: InitialParams
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState(initialCustomers)
  const [pagination, setPagination] = useState(initialPagination)
  const [search, setSearch] = useState(initialParams.search ?? '')
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>((initialParams.status as UserStatus) ?? '')
  const [isPending, startTransition] = useTransition()
  const [isRestoring, startRestore] = useTransition()
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [restoring, setRestoring] = useState<CustomerSummary | null>(null)
  const [restoreReason, setRestoreReason] = useState('')
  const [restoreError, setRestoreError] = useState('')

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string, ok: boolean) {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast({ msg, ok })
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  const isDeletedView = statusFilter === 'DEACTIVATED'

  function pushURL(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) sp.set(k, v)
      else sp.delete(k)
    }
    router.replace(`?${sp}`, { scroll: false })
  }

  function refetch(opts: { search?: string; status?: UserStatus | ''; page?: number }) {
    const s = opts.search ?? search
    const st = opts.status !== undefined ? opts.status : statusFilter
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
    searchRef.current = setTimeout(() => {
      pushURL({ search: val || undefined, page: undefined })
      refetch({ search: val })
    }, 400)
  }

  function onStatusFilter(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as UserStatus | ''
    setStatusFilter(val)
    pushURL({ status: val || undefined, page: undefined })
    refetch({ status: val })
  }

  function switchTab(tab: 'all' | 'deleted') {
    const newStatus: UserStatus | '' = tab === 'deleted' ? 'DEACTIVATED' : ''
    setStatusFilter(newStatus)
    setSearch('')
    pushURL({ status: tab === 'deleted' ? 'DEACTIVATED' : undefined, page: undefined, search: undefined })
    refetch({ status: newStatus, search: '', page: 1 })
  }

  function openRestore(c: CustomerSummary) {
    setRestoring(c)
    setRestoreReason('')
    setRestoreError('')
  }

  function confirmRestore() {
    if (!restoring) return
    const name = `${restoring.firstName} ${restoring.lastName}`
    startRestore(async () => {
      const res = await updateCustomerStatus(restoring.id, 'ACTIVE', restoreReason || undefined)
      if (res.error) { setRestoreError(res.error); return }
      setCustomers(prev => prev.filter(c => c.id !== restoring.id))
      setRestoring(null)
      showToast(`${name}'s account has been restored`, true)
    })
  }

  return (
    <main className="px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {pagination.total} {isDeletedView ? 'deleted accounts' : 'customers registered'}.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        <button
          onClick={() => !isPending && switchTab('all')}
          className={cn(
            'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
            !isDeletedView ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          All customers
        </button>
        <button
          onClick={() => !isPending && switchTab('deleted')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
            isDeletedView ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          Deleted
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex items-center gap-2.5 flex-wrap">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={onSearch}
            placeholder={isDeletedView ? 'Search deleted accounts…' : 'Search name, email, phone…'}
            className="h-9 rounded-xl border-0 bg-white pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none w-56"
          />
          {isPending && (
            <svg className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
        {!isDeletedView && (
          <div className="relative">
            <select
              value={statusFilter}
              onChange={onStatusFilter}
              className="h-9 appearance-none rounded-xl border-0 bg-white pl-3.5 pr-9 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_VERIFICATION">Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">
              {isDeletedView ? 'No deleted accounts found' : 'No customers found'}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {isDeletedView ? 'All accounts are currently active.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <div className={cn('overflow-x-auto', isPending && 'opacity-60 pointer-events-none')}>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Customer</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Phone</th>
                  {isDeletedView ? (
                    <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Deleted</th>
                  ) : (
                    <>
                      <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                      <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Verified</th>
                    </>
                  )}
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Provider</th>
                  {isDeletedView ? (
                    <th className="px-5 py-3.5" />
                  ) : (
                    <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Last Login</th>
                  )}
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
                          <div className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                            isDeletedView ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-700'
                          )}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-slate-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{c.phone}</td>
                      {isDeletedView ? (
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              Deleted
                            </span>
                            {c.deletedAt && (
                              <span className="text-xs text-slate-400">{timeAgo(c.deletedAt)}</span>
                            )}
                          </div>
                        </td>
                      ) : (
                        <>
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
                        </>
                      )}
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{c.authProvider}</span>
                      </td>
                      {isDeletedView ? (
                        <td className="px-5 py-3.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); openRestore(c) }}
                            className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            Restore
                          </button>
                        </td>
                      ) : (
                        <td className="px-5 py-3.5 text-xs text-slate-400">
                          {c.lastLoginAt
                            ? new Date(c.lastLoginAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                      )}
                    </tr>
                  )
                })}
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
              onClick={() => { pushURL({ page: String(pagination.page - 1) }); refetch({ page: pagination.page - 1 }) }}
              disabled={pagination.page <= 1 || isPending}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pagination.page <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              Previous
            </button>
            <button
              onClick={() => { pushURL({ page: String(pagination.page + 1) }); refetch({ page: pagination.page + 1 }) }}
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

      {/* Restore confirm dialog */}
      {restoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Restore Account</h3>
            <p className="mt-1 text-sm text-slate-500">
              Restore <strong>{restoring.firstName} {restoring.lastName}</strong>{"'"}s account? Their status will be set to Active.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reason <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={restoreReason}
                onChange={(e) => setRestoreReason(e.target.value)}
                rows={3}
                placeholder="Reason for restoration…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
            {restoreError && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{restoreError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setRestoring(null)}
                disabled={isRestoring}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                disabled={isRestoring}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isRestoring ? 'Restoring…' : 'Restore account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} onDismiss={() => setToast(null)} />}
    </main>
  )
}
