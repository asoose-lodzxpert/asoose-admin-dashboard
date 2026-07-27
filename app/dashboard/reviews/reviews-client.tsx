'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { Stars } from '@/app/components/ui/detail'
import { cn } from '@/app/lib/utils'
import { getReviews } from '@/app/actions/reviews'
import type { Review, ReviewStatus, ReviewSubjectType, Pagination } from '@/app/lib/types'

const STATUS_STYLES: Record<ReviewStatus, string> = {
  PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  PENDING:   'bg-amber-50 text-amber-700 ring-amber-600/20',
  HIDDEN:    'bg-slate-100 text-slate-600 ring-slate-500/20',
  REMOVED:   'bg-red-50 text-red-700 ring-red-600/20',
}

const STATUS_TABS: { label: string; value: ReviewStatus | '' }[] = [
  { label: 'All',       value: '' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Pending',   value: 'PENDING' },
  { label: 'Hidden',    value: 'HIDDEN' },
  { label: 'Removed',   value: 'REMOVED' },
]

const SUBJECT_TYPE_FILTERS: { label: string; value: ReviewSubjectType | '' }[] = [
  { label: 'All Types', value: '' },
  { label: 'Vendor',    value: 'VENDOR' },
  { label: 'Driver',    value: 'DRIVER' },
  { label: 'Rider',     value: 'RIDER' },
  { label: 'Product',   value: 'PRODUCT' },
  { label: 'Order',     value: 'ORDER' },
  { label: 'Property',  value: 'PROPERTY' },
]

const RATING_FILTERS: { label: string; value: number | '' }[] = [
  { label: 'All Ratings', value: '' },
  { label: '5 stars', value: 5 },
  { label: '4 stars', value: 4 },
  { label: '3 stars', value: 3 },
  { label: '2 stars', value: 2 },
  { label: '1 star',  value: 1 },
]

function SubjectAvatar({ image, name }: { image: string | null; name: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  if (image) {
    return (
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
        <Image src={image} alt={name} fill className="object-cover" unoptimized />
      </div>
    )
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-700">
      {initials}
    </div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  initialReviews: Review[]
  initialPagination: Pagination
}

export function ReviewsClient({ initialReviews, initialPagination }: Props) {
  const [reviews, setReviews] = useState(initialReviews)
  const [pagination, setPagination] = useState(initialPagination)
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | ''>('')
  const [subjectTypeFilter, setSubjectTypeFilter] = useState<ReviewSubjectType | ''>('')
  const [ratingFilter, setRatingFilter] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [isLoading, startLoad] = useTransition()

  const [viewReview, setViewReview] = useState<Review | null>(null)

  function load(status: ReviewStatus | '', subjectType: ReviewSubjectType | '', rating: number | '', p: number) {
    startLoad(async () => {
      const res = await getReviews({ status: status || undefined, subjectType: subjectType || undefined, rating: rating || undefined, page: p, limit: 20 })
      setReviews(res.reviews)
      setPagination(res.pagination)
      setPage(p)
    })
  }

  function handleStatusChange(value: ReviewStatus | '') {
    setStatusFilter(value)
    load(value, subjectTypeFilter, ratingFilter, 1)
  }

  function handleSubjectTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as ReviewSubjectType | ''
    setSubjectTypeFilter(value)
    load(statusFilter, value, ratingFilter, 1)
  }

  function handleRatingChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value ? Number(e.target.value) : ''
    setRatingFilter(value)
    load(statusFilter, subjectTypeFilter, value, 1)
  }

  return (
    <main className="px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reviews</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Moderate reviews left across vendors, drivers, riders, products, orders, and properties.
          {' '}<span className="font-medium text-slate-700">{pagination.total}</span> total.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
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

        <div className="relative ml-1">
          <select
            value={subjectTypeFilter}
            onChange={handleSubjectTypeChange}
            disabled={isLoading}
            className="appearance-none rounded-xl border-0 bg-white py-2 pl-3.5 pr-9 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer disabled:opacity-60"
          >
            {SUBJECT_TYPE_FILTERS.map((f) => (
              <option key={String(f.value)} value={f.value}>{f.label}</option>
            ))}
          </select>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </div>

        <div className="relative">
          <select
            value={ratingFilter}
            onChange={handleRatingChange}
            disabled={isLoading}
            className="appearance-none rounded-xl border-0 bg-white py-2 pl-3.5 pr-9 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer disabled:opacity-60"
          >
            {RATING_FILTERS.map((f) => (
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
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-2xl">
            <svg className="h-6 w-6 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {reviews.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">No reviews found</p>
            <p className="mt-0.5 text-xs text-slate-400">Try a different status, type, or rating filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Subject</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Reviewer</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Rating</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Comment</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Reported</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reviews.map((r) => (
                  <tr key={r.id} onClick={() => setViewReview(r)} className="cursor-pointer hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <SubjectAvatar image={r.subject.image} name={r.subject.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{r.subject.name}</p>
                          <p className="text-xs text-slate-400">{r.subjectType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{r.user.firstName} {r.user.lastName}</td>
                    <td className="px-5 py-3.5"><Stars rating={r.rating} /></td>
                    <td className="max-w-[260px] px-5 py-3.5">
                      {r.comment ? (
                        <p className="truncate text-xs text-slate-500" title={r.comment}>{r.comment}</p>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[r.status])}>
                        {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {r.reportedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-600/20">
                          {r.reportedCount} report{r.reportedCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">{formatDate(r.createdAt)}</td>
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
                onClick={() => load(statusFilter, subjectTypeFilter, ratingFilter, page - 1)}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                </svg>
                Previous
              </button>
              <button
                onClick={() => load(statusFilter, subjectTypeFilter, ratingFilter, page + 1)}
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

      {/* Detail modal */}
      <Modal
        open={viewReview != null}
        onClose={() => setViewReview(null)}
        title={viewReview?.subject.name ?? 'Review'}
        description={viewReview ? `${viewReview.subjectType} · reviewed by ${viewReview.user.firstName} ${viewReview.user.lastName}` : undefined}
        size="md"
        footer={<Button variant="secondary" size="sm" onClick={() => setViewReview(null)}>Close</Button>}
      >
        {viewReview && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[viewReview.status])}>
                {viewReview.status.charAt(0) + viewReview.status.slice(1).toLowerCase()}
              </span>
              <Stars rating={viewReview.rating} />
              <span className="text-xs text-slate-400">{formatDate(viewReview.createdAt)}</span>
              {viewReview.reportedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-600/20">
                  {viewReview.reportedCount} report{viewReview.reportedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {viewReview.comment && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Comment</h3>
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
                  {viewReview.comment}
                </p>
              </div>
            )}

            {viewReview.tags.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {viewReview.tags.map((t) => (
                    <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {viewReview.responseText && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Response {viewReview.respondedAt && `· ${formatDate(viewReview.respondedAt)}`}
                </h3>
                <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800 ring-1 ring-inset ring-indigo-100">
                  {viewReview.responseText}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Helpful</dt>
                <dd className="mt-0.5 font-medium text-slate-700">{viewReview.helpfulCount}</dd>
              </div>
              {viewReview.orderId && (
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Order ID</dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-700">{viewReview.orderId}</dd>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </main>
  )
}
