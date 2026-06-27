'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { DocsGrid } from '@/app/components/ui/doc-card'
import { cn } from '@/app/lib/utils'
import { getApplications, reviewApplication } from '@/app/actions/applications'
import type { Application, AppStatus, AppTargetRole } from '@/app/lib/types'

const STATUS_STYLES: Record<AppStatus, string> = {
  IN_PROGRESS:    'bg-slate-100 text-slate-600 ring-slate-500/20',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  APPROVED:       'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REJECTED:       'bg-red-50 text-red-700 ring-red-600/20',
}

const ROLE_STYLES: Record<AppTargetRole, string> = {
  VENDOR: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  RIDER:  'bg-sky-50 text-sky-700 ring-sky-600/20',
  DRIVER: 'bg-violet-50 text-violet-700 ring-violet-600/20',
}

const STATUS_TABS: { label: string; value: AppStatus | '' }[] = [
  { label: 'All',            value: '' },
  { label: 'Pending Review', value: 'PENDING_REVIEW' },
  { label: 'Approved',       value: 'APPROVED' },
  { label: 'Rejected',       value: 'REJECTED' },
  { label: 'In Progress',    value: 'IN_PROGRESS' },
]

const ROLE_FILTERS: { label: string; value: AppTargetRole | '' }[] = [
  { label: 'All Roles', value: '' },
  { label: 'Vendor',    value: 'VENDOR' },
  { label: 'Rider',     value: 'RIDER' },
  { label: 'Driver',    value: 'DRIVER' },
]

const EMPTY_MESSAGES: Record<AppStatus | '', string> = {
  '':             'No applications found.',
  PENDING_REVIEW: 'No applications pending review.',
  APPROVED:       'No approved applications.',
  REJECTED:       'No rejected applications.',
  IN_PROGRESS:    'No in-progress applications.',
}

type Pagination = { page: number; limit: number; total: number; totalPages: number }

interface Props {
  initialApplications: Application[]
  initialPagination: Pagination
}

export function ApplicationsClient({ initialApplications, initialPagination }: Props) {
  const [applications, setApplications] = useState(initialApplications)
  const [pagination, setPagination] = useState(initialPagination)
  const [statusFilter, setStatusFilter] = useState<AppStatus | ''>('PENDING_REVIEW')
  const [roleFilter, setRoleFilter] = useState<AppTargetRole | ''>('')
  const [page, setPage] = useState(1)
  const [isLoading, startLoad] = useTransition()

  const [viewApp, setViewApp] = useState<Application | null>(null)
  const [reviewTarget, setReviewTarget] = useState<{ app: Application; approved: boolean } | null>(null)
  const [notes, setNotes] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [isReviewing, startReview] = useTransition()

  function loadApplications(status: AppStatus | '', role: AppTargetRole | '', p: number) {
    startLoad(async () => {
      const res = await getApplications({
        status: status || undefined,
        targetRole: role || undefined,
        page: p,
        limit: 20,
      })
      setApplications(res.applications)
      setPagination(res.pagination)
      setPage(p)
    })
  }

  function handleStatusChange(value: AppStatus | '') {
    setStatusFilter(value)
    loadApplications(value, roleFilter, 1)
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as AppTargetRole | ''
    setRoleFilter(value)
    loadApplications(statusFilter, value, 1)
  }

  function handleReview() {
    if (!reviewTarget) return
    setReviewError('')
    if (!reviewTarget.approved && !notes.trim()) {
      setReviewError('Please provide a reason for rejection.')
      return
    }
    startReview(async () => {
      const res = await reviewApplication(reviewTarget.app.id, reviewTarget.approved, notes)
      if (res.error) { setReviewError(res.error); return }
      setReviewTarget(null)
      setNotes('')
      loadApplications(statusFilter, roleFilter, page)
    })
  }

  function profileKeyValue(profile: Record<string, unknown>) {
    const entries = Object.entries(profile).filter(([, v]) => v != null && v !== '')
    if (entries.length === 0) return <p className="text-xs text-slate-400">No profile data.</p>
    return (
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {entries.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {k.replace(/([A-Z])/g, ' $1').trim()}
            </dt>
            <dd className="mt-0.5 text-sm text-slate-700">{String(v)}</dd>
          </div>
        ))}
      </dl>
    )
  }

  return (
    <main className="px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Review onboarding applications for vendors, riders, and drivers.
          {' '}<span className="font-medium text-slate-700">{pagination.total}</span> total.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={String(tab.value)}
              onClick={() => handleStatusChange(tab.value)}
              disabled={isLoading}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60',
                statusFilter === tab.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Role dropdown */}
        <div className="relative ml-1">
          <select
            value={roleFilter}
            onChange={handleRoleChange}
            disabled={isLoading}
            className="appearance-none rounded-xl border-0 bg-white py-2 pl-3.5 pr-9 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer disabled:opacity-60"
          >
            {ROLE_FILTERS.map((f) => (
              <option key={String(f.value)} value={f.value}>{f.label}</option>
            ))}
          </select>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-2xl">
            <svg className="h-6 w-6 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {applications.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">
              {EMPTY_MESSAGES[statusFilter]}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">Try a different status or role filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Applicant</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Role</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Submitted</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Notes</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{app.userName}</p>
                      <p className="text-xs text-slate-400">{app.userEmail}</p>
                      {app.userPhone && <p className="text-xs text-slate-400">{app.userPhone}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                        ROLE_STYLES[app.targetRole]
                      )}>
                        {app.targetRole}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                        STATUS_STYLES[app.status]
                      )}>
                        {app.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {app.completedAt
                        ? new Date(app.completedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="max-w-[200px] px-5 py-3.5">
                      {app.reviewNotes ? (
                        <p className="truncate text-xs text-slate-500" title={app.reviewNotes}>
                          {app.reviewNotes}
                        </p>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewApp(app)}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          View
                        </button>
                        {app.status === 'PENDING_REVIEW' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => { setReviewError(''); setNotes(''); setReviewTarget({ app, approved: true }) }}
                              className="h-7 px-2.5 text-xs"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => { setReviewError(''); setNotes(''); setReviewTarget({ app, approved: false }) }}
                              className="h-7 px-2.5 text-xs"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
            <p className="text-xs text-slate-400">
              Page <span className="font-medium text-slate-700">{pagination.page}</span> of{' '}
              <span className="font-medium text-slate-700">{pagination.totalPages}</span>
              {' '}· {pagination.total} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadApplications(statusFilter, roleFilter, page - 1)}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                </svg>
                Previous
              </button>
              <button
                onClick={() => loadApplications(statusFilter, roleFilter, page + 1)}
                disabled={page >= pagination.totalPages || isLoading}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View detail modal */}
      <Modal
        open={viewApp != null}
        onClose={() => setViewApp(null)}
        title={viewApp?.userName ?? 'Application Detail'}
        description={`${viewApp?.targetRole} application · ${viewApp?.userEmail}`}
        size="lg"
        footer={
          viewApp?.status === 'PENDING_REVIEW' ? (
            <>
              <Button
                variant="danger"
                size="sm"
                onClick={() => { setViewApp(null); setReviewError(''); setNotes(''); setReviewTarget({ app: viewApp, approved: false }) }}
              >
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => { setViewApp(null); setReviewError(''); setNotes(''); setReviewTarget({ app: viewApp, approved: true }) }}
              >
                Approve
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setViewApp(null)}>Close</Button>
          )
        }
      >
        {viewApp && (
          <div className="space-y-5">
            {/* Status badge in modal */}
            <div className="flex items-center gap-2">
              <span className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                STATUS_STYLES[viewApp.status]
              )}>
                {viewApp.status.replace(/_/g, ' ')}
              </span>
              <span className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                ROLE_STYLES[viewApp.targetRole]
              )}>
                {viewApp.targetRole}
              </span>
              {viewApp.completedAt && (
                <span className="text-xs text-slate-400">
                  Submitted {new Date(viewApp.completedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>

            {/* Profile */}
            {viewApp.profile && Object.keys(viewApp.profile).length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Profile</h3>
                {profileKeyValue(viewApp.profile)}
              </div>
            )}

            {/* Documents */}
            {viewApp.documents && Object.keys(viewApp.documents).length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Documents</h3>
                <DocsGrid docs={viewApp.documents} />
              </div>
            )}

            {/* Bank details */}
            {viewApp.bankDetails && Object.keys(viewApp.bankDetails).length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Bank Details</h3>
                {profileKeyValue(viewApp.bankDetails as Record<string, unknown>)}
              </div>
            )}

            {/* Review notes */}
            {viewApp.reviewNotes && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Review Notes</h3>
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
                  {viewApp.reviewNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Review modal */}
      <Modal
        open={reviewTarget != null}
        onClose={() => { if (!isReviewing) setReviewTarget(null) }}
        title={reviewTarget?.approved ? 'Approve Application' : 'Reject Application'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setReviewTarget(null)} disabled={isReviewing}>
              Cancel
            </Button>
            <Button
              variant={reviewTarget?.approved ? 'primary' : 'danger'}
              size="sm"
              loading={isReviewing}
              onClick={handleReview}
            >
              {reviewTarget?.approved ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        {reviewError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {reviewError}
          </div>
        )}
        <p className="mb-3 text-sm text-slate-600">
          {reviewTarget?.approved ? 'Approve' : 'Reject'} application from{' '}
          <span className="font-semibold text-slate-900">{reviewTarget?.app.userName}</span>?
        </p>
        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
          Notes{' '}
          <span className="font-normal text-slate-400">
            {reviewTarget?.approved ? '(optional)' : '(required)'}
          </span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={reviewTarget?.approved ? 'Any notes for the applicant…' : 'Reason for rejection…'}
          className="w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </Modal>
    </main>
  )
}
