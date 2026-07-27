'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { cn } from '@/app/lib/utils'
import type { TimelineEvent } from '@/app/lib/types'

interface ActivityTimelineProps {
  events: TimelineEvent[]
  error?: string
  entityLabel: string
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'

  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function eventTone(event: TimelineEvent) {
  const value = `${event.status ?? ''} ${event.stage ?? ''}`.toUpperCase()

  if (/(CANCEL|REJECT|FAIL|REFUND)/.test(value)) {
    return {
      dot: 'border-red-200 bg-red-50 text-red-600',
      badge: 'bg-red-50 text-red-700 ring-red-600/15',
      line: 'bg-red-100',
    }
  }
  if (/(DELIVERED|COMPLETED|CHECKED_OUT|PAYMENT_CONFIRMED)/.test(value)) {
    return {
      dot: 'border-emerald-200 bg-emerald-50 text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
      line: 'bg-emerald-100',
    }
  }
  if (/(PENDING|SEARCHING|REQUESTED)/.test(value)) {
    return {
      dot: 'border-amber-200 bg-amber-50 text-amber-600',
      badge: 'bg-amber-50 text-amber-700 ring-amber-600/15',
      line: 'bg-amber-100',
    }
  }
  return {
    dot: 'border-indigo-200 bg-indigo-50 text-indigo-600',
    badge: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15',
    line: 'bg-indigo-100',
  }
}

function EventIcon({ source }: { source: string }) {
  if (source === 'WORKFLOW_UPDATE') {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.28-9.97a.75.75 0 0 0-1.06-1.06L9 10.19 7.78 8.97a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.06 0l3.75-3.75Z" clipRule="evenodd" />
    </svg>
  )
}

function Metadata({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return null

  const values = Object.entries(metadata).filter(
    ([, value]) => ['string', 'number', 'boolean'].includes(typeof value)
  )
  if (!values.length) return null

  return (
    <dl className="mt-3 flex flex-wrap gap-2">
      {values.map(([key, value]) => (
        <div key={key} className="rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-inset ring-slate-100">
          <dt className="inline text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {formatLabel(key)}
          </dt>
          <dd className="ml-1.5 inline text-xs font-medium text-slate-600">
            {key.toLowerCase().includes('amount') && typeof value === 'number'
              ? new Intl.NumberFormat('en-NG', {
                  style: 'currency',
                  currency: 'NGN',
                  maximumFractionDigits: 0,
                }).format(value)
              : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function ActivityTimeline({
  events,
  error,
  entityLabel,
}: ActivityTimelineProps) {
  const router = useRouter()
  const [isRefreshing, startRefreshing] = useTransition()

  function refresh() {
    startRefreshing(() => router.refresh())
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Activity timeline</h2>
            {!!events.length && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {events.length}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            A chronological record of {entityLabel.toLowerCase()} activity
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-wait disabled:opacity-50"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
          </svg>
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="px-6 py-5">
        {error && !events.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-sm font-semibold text-amber-800">Activity is temporarily unavailable</p>
            <p className="mt-1 text-xs leading-5 text-amber-700">{error}</p>
          </div>
        ) : !events.length ? (
          <div className="flex flex-col items-center py-7 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9.25 5.75a.75.75 0 0 1 1.5 0v4.1l2.45 1.42a.75.75 0 0 1-.75 1.3l-2.83-1.64a.75.75 0 0 1-.37-.65V5.75Z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">No activity recorded yet</p>
            <p className="mt-1 text-xs text-slate-500">New status and workflow updates will appear here.</p>
          </div>
        ) : (
          <ol>
            {events.map((event, index) => {
              const tone = eventTone(event)
              const label = event.status ?? event.stage ?? formatLabel(event.source)
              const isLast = index === events.length - 1

              return (
                <li key={event.id} className="relative flex gap-4 pb-7 last:pb-0">
                  {!isLast && (
                    <span
                      className={cn('absolute left-[17px] top-9 h-[calc(100%-1.5rem)] w-px', tone.line)}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                      tone.dot
                    )}
                  >
                    <EventIcon source={event.source} />
                  </span>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{formatLabel(label)}</p>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                            tone.badge
                          )}
                        >
                          {event.source === 'WORKFLOW_UPDATE' ? 'Workflow' : 'Status'}
                        </span>
                      </div>
                      <time
                        dateTime={event.createdAt}
                        className="shrink-0 text-[11px] font-medium text-slate-400"
                      >
                        {formatDateTime(event.createdAt)}
                      </time>
                    </div>

                    {event.previousStatus && event.status && (
                      <p className="mt-1 text-xs text-slate-400">
                        {formatLabel(event.previousStatus)}
                        <span className="mx-1.5">→</span>
                        <span className="font-medium text-slate-600">{formatLabel(event.status)}</span>
                      </p>
                    )}
                    {event.message && (
                      <p className="mt-2 text-sm leading-6 text-slate-600">{event.message}</p>
                    )}
                    {event.note && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs italic leading-5 text-slate-600">
                        “{event.note}”
                      </p>
                    )}
                    {(event.actorName || event.actorRole) && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
                          {(event.actorName ?? event.actorRole ?? 'S').charAt(0).toUpperCase()}
                        </span>
                        <span>
                          {event.actorName ?? 'System'}
                          {event.actorRole && (
                            <span className="ml-1 text-slate-400">· {formatLabel(event.actorRole)}</span>
                          )}
                        </span>
                      </div>
                    )}
                    <Metadata metadata={event.metadata} />
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
