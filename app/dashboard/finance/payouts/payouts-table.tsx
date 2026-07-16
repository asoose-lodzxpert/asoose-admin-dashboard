'use client'

import { useState, useTransition } from 'react'
import { cn, formatNaira } from '@/app/lib/utils'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { useToast } from '@/app/components/ui/toast'
import { getPayouts, approvePayout, confirmApproval, rejectPayout } from '@/app/actions/payouts'
import type { PayoutSummary, PayoutStatus, Pagination } from '@/app/lib/types'

const STATUS_STYLES: Record<PayoutStatus, string> = {
  PENDING:    'bg-amber-50 text-amber-700 ring-amber-600/20',
  APPROVED:   'bg-sky-50 text-sky-700 ring-sky-600/20',
  PROCESSING: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  COMPLETED:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  PAID:       'bg-green-50 text-green-700 ring-green-600/20',
  REJECTED:   'bg-red-50 text-red-700 ring-red-600/20',
  FAILED:     'bg-red-50 text-red-600 ring-red-500/20',
  CANCELLED:  'bg-slate-100 text-slate-600 ring-slate-500/20',
}

const STATUS_DOT: Record<PayoutStatus, string> = {
  PENDING:    'bg-amber-400',
  APPROVED:   'bg-sky-500',
  PROCESSING: 'bg-blue-500',
  COMPLETED:  'bg-emerald-500',
  PAID:       'bg-green-500',
  REJECTED:   'bg-red-500',
  FAILED:     'bg-red-500',
  CANCELLED:  'bg-slate-400',
}

const STATUS_FILTERS: { label: string; value: PayoutStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const INPUT_CLS =
  'w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'

function formatStatus(s: PayoutStatus): string {
  return s.charAt(0) + s.slice(1).toLowerCase()
}

export function PayoutsTable({
  initialPayouts,
  initialPagination,
}: {
  initialPayouts: PayoutSummary[]
  initialPagination: Pagination
}) {
  const toast = useToast()
  const [payouts, setPayouts] = useState(initialPayouts)
  const [pagination, setPagination] = useState(initialPagination)
  const [status, setStatus] = useState<PayoutStatus | ''>('')
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  // Approve flow
  const [approveTarget, setApproveTarget] = useState<PayoutSummary | null>(null)
  const [approveStep, setApproveStep] = useState<'confirm' | 'otp'>('confirm')
  const [otp, setOtp] = useState('')
  const [approveError, setApproveError] = useState('')
  const [approvePending, startApproveTransition] = useTransition()

  // Reject flow
  const [rejectTarget, setRejectTarget] = useState<PayoutSummary | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [rejectPending, startRejectTransition] = useTransition()

  function refetch(opts?: { status?: PayoutStatus | ''; page?: number }) {
    const st = opts?.status !== undefined ? opts.status : status
    const pg = opts?.page !== undefined ? opts.page : page
    startTransition(async () => {
      const res = await getPayouts({ status: st || undefined, page: pg, limit: 20 })
      setPayouts(res.payouts)
      setPagination(res.pagination)
    })
  }

  function onStatusFilter(value: PayoutStatus | '') {
    setStatus(value)
    setPage(1)
    refetch({ status: value, page: 1 })
  }

  function goToPage(pg: number) {
    setPage(pg)
    refetch({ page: pg })
  }

  // Approve
  function openApprove(p: PayoutSummary) {
    setApproveTarget(p)
    setApproveStep('confirm')
    setOtp('')
    setApproveError('')
  }

  function handleApprove() {
    if (!approveTarget) return
    startApproveTransition(async () => {
      const res = await approvePayout(approveTarget.id)
      if (res.error) {
        setApproveError(res.error)
        toast.error(res.error)
        return
      }
      setApproveStep('otp')
      setApproveError('')
    })
  }

  function handleConfirmOtp() {
    if (!approveTarget || !otp.trim()) return
    startApproveTransition(async () => {
      const res = await confirmApproval(approveTarget.id, otp.trim())
      if (res.error) {
        setApproveError(res.error)
        toast.error(res.error)
        return
      }
      setApproveTarget(null)
      refetch()
      toast.success('Payout approved.')
    })
  }

  // Reject
  function openReject(p: PayoutSummary) {
    setRejectTarget(p)
    setRejectReason('')
    setRejectError('')
  }

  function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) {
      setRejectError('Please provide a reason.')
      return
    }
    startRejectTransition(async () => {
      const res = await rejectPayout(rejectTarget.id, rejectReason.trim())
      if (res.error) {
        setRejectError(res.error)
        toast.error(res.error)
        return
      }
      setRejectTarget(null)
      refetch()
      toast.success('Payout rejected.')
    })
  }

  return (
    <main className="px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {pagination.total} payout{pagination.total !== 1 ? 's' : ''} total.
        </p>
      </div>

      {/* Status filters */}
      <div className="mb-5 flex gap-2 flex-wrap">
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
        {isPending && (
          <svg className="ml-2 mt-1 h-4 w-4 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">No payouts found</p>
            <p className="mt-0.5 text-xs text-slate-400">Try adjusting your filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Payout ID</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Amount</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Fee</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Net</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Date</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs font-medium text-slate-900">{p.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {formatNaira(p.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {formatNaira(p.feeAmount)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {formatNaira(p.netAmount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                          STATUS_STYLES[p.status]
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[p.status])} />
                        {formatStatus(p.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {new Date(p.createdAt).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      <br />
                      <span className="text-slate-400">
                        {new Date(p.createdAt).toLocaleTimeString('en-NG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openApprove(p)}
                            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openReject(p)}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {p.status === 'FAILED' && p.failureReason && (
                        <p className="text-xs text-red-500 max-w-48 truncate" title={p.failureReason}>
                          {p.failureReason}
                        </p>
                      )}
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
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isPending}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                page <= 1
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              Previous
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= pagination.totalPages || isPending}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                page >= pagination.totalPages
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      <Modal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title={approveStep === 'confirm' ? 'Approve Payout' : 'Enter OTP'}
        description={
          approveStep === 'confirm'
            ? `Approve payout of ${approveTarget ? formatNaira(approveTarget.amount) : ''} ? An OTP will be sent to your email.`
            : 'Enter the OTP sent to your email to confirm this payout.'
        }
        size="sm"
        footer={
          approveStep === 'confirm' ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setApproveTarget(null)} disabled={approvePending}>
                Cancel
              </Button>
              <Button size="sm" loading={approvePending} onClick={handleApprove}>
                Send OTP
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => setApproveTarget(null)} disabled={approvePending}>
                Cancel
              </Button>
              <Button size="sm" loading={approvePending} onClick={handleConfirmOtp}>
                Confirm
              </Button>
            </>
          )
        }
      >
        {approveStep === 'otp' && (
          <div className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                setApproveError('')
              }}
              className={INPUT_CLS}
              autoFocus
            />
          </div>
        )}
        {approveError && <p className="mt-3 text-sm text-red-600">{approveError}</p>}
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Payout"
        description={`Reject payout of ${rejectTarget ? formatNaira(rejectTarget.amount) : ''} ? This action cannot be undone.`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRejectTarget(null)} disabled={rejectPending}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={rejectPending} onClick={handleReject}>
              Reject
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Reason for rejection</label>
            <textarea
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value)
                setRejectError('')
              }}
              placeholder="e.g. Invalid bank account details"
              rows={3}
              className={INPUT_CLS}
            />
          </div>
          {rejectError && <p className="text-sm text-red-600">{rejectError}</p>}
        </div>
      </Modal>
    </main>
  )
}
