'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/app/lib/utils'
import { formatNaira } from '@/app/lib/utils'
import { getPaystackTransactions } from '@/app/actions/finance'
import type { PaystackTransaction, PaystackStatus } from '@/app/lib/types'

const STATUS_STYLES: Record<PaystackStatus, string> = {
  success:   'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  failed:    'bg-red-50 text-red-700 ring-red-600/20',
  abandoned: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

const STATUS_DOT: Record<PaystackStatus, string> = {
  success:   'bg-emerald-500',
  failed:    'bg-red-500',
  abandoned: 'bg-slate-400',
}

const STATUS_FILTERS: { label: string; value: PaystackStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
  { label: 'Abandoned', value: 'abandoned' },
]

function formatChannel(channel: string): string {
  return channel.charAt(0).toUpperCase() + channel.slice(1)
}

function formatMetadataType(tx: PaystackTransaction): string {
  if (!tx.metadata?.type) return '—'
  return String(tx.metadata.type).replace(/-/g, ' ').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

interface Pagination {
  total: number
  page: number
  pageCount: number
  perPage: number
}

export function PaystackTable({
  initialTransactions,
  pagination: initialPagination,
}: {
  initialTransactions: PaystackTransaction[]
  pagination: Pagination
}) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [pagination, setPagination] = useState(initialPagination)
  const [status, setStatus] = useState<PaystackStatus | ''>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isPending, startTransition] = useTransition()

  function refetch(opts?: { status?: PaystackStatus | ''; from?: string; to?: string; page?: number }) {
    const st = opts?.status !== undefined ? opts.status : status
    const f = opts?.from !== undefined ? opts.from : fromDate
    const t = opts?.to !== undefined ? opts.to : toDate
    const p = opts?.page ?? 1
    startTransition(async () => {
      const res = await getPaystackTransactions({
        status: st || undefined,
        from: f || undefined,
        to: t || undefined,
        page: p,
        perPage: 20,
      })
      setTransactions(res.transactions)
      setPagination(res.pagination)
    })
  }

  function onStatusFilter(value: PaystackStatus | '') {
    setStatus(value)
    refetch({ status: value })
  }

  function onFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFromDate(e.target.value)
    refetch({ from: e.target.value })
  }

  function onToChange(e: React.ChangeEvent<HTMLInputElement>) {
    setToDate(e.target.value)
    refetch({ to: e.target.value })
  }

  function goToPage(page: number) {
    refetch({ page })
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Paystack Transactions</h1>
        <p className="mt-0.5 text-sm text-slate-500">{pagination.total} transactions found.</p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex items-end gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onStatusFilter(f.value)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                status === f.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={onFromChange}
              className="h-9 rounded-xl border-0 bg-white px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">To</label>
            <input
              type="date"
              value={toDate}
              onChange={onToChange}
              className="h-9 rounded-xl border-0 bg-white px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        {isPending && (
          <svg className="h-4 w-4 animate-spin text-indigo-500 self-center" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">No transactions found</p>
            <p className="mt-0.5 text-xs text-slate-400">Try adjusting your filters or date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Reference</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Amount</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Channel</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Customer</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Type</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs font-medium text-slate-900">{tx.reference}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[tx.status])}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[tx.status])} />
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {formatNaira(tx.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {formatChannel(tx.channel)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {tx.customerEmail}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {formatMetadataType(tx)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      {tx.paidAt
                        ? new Date(tx.paidAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : new Date(tx.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.pageCount}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1 || isPending}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pagination.page <= 1
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              Previous
            </button>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.pageCount || isPending}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pagination.page >= pagination.pageCount
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-700 hover:bg-slate-100'
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
