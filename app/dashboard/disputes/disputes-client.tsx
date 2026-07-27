'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getDisputes } from '@/app/actions/disputes'
import { cn } from '@/app/lib/utils'
import type {
  DisputePriority,
  DisputeStatus,
  DisputeSummary,
  Pagination,
} from '@/app/lib/types'

const STATUSES: Exclude<DisputeStatus, 'RESOLVED'>[] = ['OPEN', 'IN_REVIEW', 'ESCALATED', 'CLOSED']
const PRIORITIES: DisputePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const STATUS_STYLE: Record<DisputeStatus, string> = {
  OPEN: 'bg-sky-50 text-sky-700',
  IN_REVIEW: 'bg-amber-50 text-amber-700',
  ESCALATED: 'bg-red-50 text-red-700',
  CLOSED: 'bg-slate-100 text-slate-600',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
}
const PRIORITY_STYLE: Record<DisputePriority, string> = {
  LOW: 'text-slate-500',
  MEDIUM: 'text-sky-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
}
const label = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

export function DisputesClient({
  initialDisputes,
  initialPagination,
  categories,
}: {
  initialDisputes: DisputeSummary[]
  initialPagination: Pagination
  categories: string[]
}) {
  const router = useRouter()
  const [disputes, setDisputes] = useState(initialDisputes)
  const [pagination, setPagination] = useState(initialPagination)
  const [status, setStatus] = useState<DisputeStatus | ''>('')
  const [priority, setPriority] = useState<DisputePriority | ''>('')
  const [category, setCategory] = useState('')
  const [isPending, startTransition] = useTransition()

  function load(overrides: {
    status?: DisputeStatus | ''
    priority?: DisputePriority | ''
    category?: string
    page?: number
  }) {
    const nextStatus = overrides.status ?? status
    const nextPriority = overrides.priority ?? priority
    const nextCategory = overrides.category ?? category
    startTransition(async () => {
      const result = await getDisputes({
        status: nextStatus,
        priority: nextPriority,
        category: nextCategory,
        page: overrides.page ?? 1,
      })
      setDisputes(result.disputes)
      setPagination(result.pagination)
    })
  }

  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispute management</h1>
          <p className="mt-1 text-sm text-slate-500">Review, assign and resolve customer complaints.</p>
        </div>
        <div className="rounded-xl bg-white px-4 py-2.5 text-right shadow-sm ring-1 ring-slate-200">
          <p className="text-xl font-bold text-slate-900">{pagination.total}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Disputes</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <select value={status} onChange={e => { const value = e.target.value as DisputeStatus | ''; setStatus(value); load({ status: value }) }} className="h-10 rounded-xl border-0 bg-slate-50 px-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All statuses</option>
          {STATUSES.map(value => <option key={value} value={value}>{label(value)}</option>)}
          <option value="RESOLVED">Resolved</option>
        </select>
        <select value={priority} onChange={e => { const value = e.target.value as DisputePriority | ''; setPriority(value); load({ priority: value }) }} className="h-10 rounded-xl border-0 bg-slate-50 px-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All priorities</option>
          {PRIORITIES.map(value => <option key={value} value={value}>{label(value)}</option>)}
        </select>
        <select value={category} onChange={e => { setCategory(e.target.value); load({ category: e.target.value }) }} className="h-10 min-w-48 rounded-xl border-0 bg-slate-50 px-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All categories</option>
          {categories.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        {(status || priority || category) && (
          <button onClick={() => { setStatus(''); setPriority(''); setCategory(''); load({ status: '', priority: '', category: '' }) }} className="px-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800">Reset filters</button>
        )}
        {isPending && <span className="ml-auto self-center text-xs font-medium text-indigo-600">Updating…</span>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {disputes.length ? (
          <div className={cn('overflow-x-auto', isPending && 'pointer-events-none opacity-60')}>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <tr><th className="px-5 py-3.5">Dispute</th><th className="px-5 py-3.5">Category</th><th className="px-5 py-3.5">Priority</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Created</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {disputes.map(dispute => (
                  <tr key={dispute.id} onClick={() => router.push(`/dashboard/disputes/${dispute.id}`)} className="cursor-pointer transition-colors hover:bg-slate-50">
                    <td className="max-w-md px-5 py-4"><p className="font-semibold text-slate-900">{dispute.title}</p><p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{dispute.message}</p></td>
                    <td className="px-5 py-4 text-slate-600">{dispute.category}</td>
                    <td className={cn('px-5 py-4 text-xs font-bold', PRIORITY_STYLE[dispute.priority])}>{label(dispute.priority)}</td>
                    <td className="px-5 py-4"><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLE[dispute.status])}>{label(dispute.status)}</span></td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">{new Date(dispute.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="py-16 text-center"><p className="text-sm font-semibold text-slate-700">No disputes found</p><p className="mt-1 text-xs text-slate-400">Try adjusting the filters.</p></div>}
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm"><span className="text-slate-500">Page {pagination.page} of {pagination.totalPages}</span><div className="flex gap-2"><button disabled={pagination.page <= 1 || isPending} onClick={() => load({ page: pagination.page - 1 })} className="rounded-lg bg-white px-3 py-2 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Previous</button><button disabled={pagination.page >= pagination.totalPages || isPending} onClick={() => load({ page: pagination.page + 1 })} className="rounded-lg bg-white px-3 py-2 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Next</button></div></div>
      )}
    </main>
  )
}
