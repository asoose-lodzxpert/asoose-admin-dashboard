'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { io } from 'socket.io-client'
import {
  getNotifications,
  markAllNotificationsRead,
} from '@/app/actions/notifications'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import type { InAppNotification, NotificationsData } from '@/app/lib/types'

interface NotificationCenterProps {
  accessToken: string
  initialData: NotificationsData | null
  initialUnreadCount: number
  socketUrl: string
}

function BellIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022 23.81 23.81 0 0 0 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06Z" />
    </svg>
  )
}

function notificationHref(notification: InAppNotification): string | null {
  function dataId(key: string) {
    const value = notification.data?.[key]
    if (typeof value === 'string' && value.trim()) return value

    const nestedKey = key.endsWith('Id') ? key.slice(0, -2) : key
    const nested = notification.data?.[nestedKey]
    if (nested && typeof nested === 'object' && 'id' in nested) {
      const nestedId = (nested as { id?: unknown }).id
      if (typeof nestedId === 'string' && nestedId.trim()) return nestedId
    }

    return null
  }

  function route(segment: string, id: string | null) {
    return id ? `/dashboard/${segment}/${encodeURIComponent(id)}` : null
  }

  switch (notification.referenceType?.toUpperCase()) {
    case 'ORDER':
      return route('orders', dataId('orderId') ?? notification.referenceId)
    case 'RIDE':
      return route('rides', dataId('rideId') ?? notification.referenceId)
    case 'PARCEL':
      return route('parcels', dataId('parcelId') ?? notification.referenceId)
    case 'DELIVERY': {
      const parcelId = dataId('parcelId')
      if (parcelId) return route('parcels', parcelId)

      const orderId = dataId('orderId')
      if (orderId) return route('orders', orderId)

      // A delivery reference ID identifies a delivery record, not necessarily
      // a parcel or order, so do not create a known-broken detail link.
      return null
    }
    case 'BOOKING':
      return route('bookings', dataId('bookingId') ?? notification.referenceId)
    case 'CUSTOMER':
      return route('customers', dataId('customerId') ?? notification.referenceId)
    default:
      return null
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function NotificationGlyph({ type }: { type: string }) {
  const isOrder = type.includes('ORDER')
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
        isOrder ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
      )}
    >
      {isOrder ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4.5 w-4.5" aria-hidden="true">
          <path d="M1 1.75A.75.75 0 0 1 1.75 1h1.5a.75.75 0 0 1 .73.58L4.31 3h12.94a.75.75 0 0 1 .73.92l-1.5 6.5a.75.75 0 0 1-.73.58H6.06l.23 1h9.46a.75.75 0 0 1 0 1.5H5.69a.75.75 0 0 1-.73-.58L2.65 2.5h-.9A.75.75 0 0 1 1 1.75ZM7 17a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 7 17Zm9 0a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 16 17Z" />
        </svg>
      ) : (
        <BellIcon className="h-4.5 w-4.5" />
      )}
    </div>
  )
}

function NotificationRow({
  notification,
  onNavigate,
}: {
  notification: InAppNotification
  onNavigate: () => void
}) {
  const href = notificationHref(notification)
  const content = (
    <>
      <NotificationGlyph type={notification.type} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-sm font-semibold leading-5 text-slate-900">
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-label="Unread" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">
          {notification.body}
        </p>
        <p className="mt-1 text-[11px] font-medium text-slate-400">
          {formatDate(notification.createdAt)}
        </p>
      </div>
    </>
  )

  const className =
    'flex w-full gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-slate-50'

  return href ? (
    <Link href={href} onClick={onNavigate} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

export function NotificationCenter({
  accessToken,
  initialData,
  initialUnreadCount,
  socketUrl,
}: NotificationCenterProps) {
  const toast = useToast()
  const panelRef = useRef<HTMLDivElement>(null)
  const knownIds = useRef(new Set(initialData?.notifications.map((item) => item.id) ?? []))
  const [open, setOpen] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [notifications, setNotifications] = useState(initialData?.notifications ?? [])
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [liveNotification, setLiveNotification] = useState<InAppNotification | null>(null)
  const [isLoading, startLoading] = useTransition()
  const [isMarkingRead, startMarkingRead] = useTransition()

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    if (!liveNotification) return
    const timeout = window.setTimeout(() => setLiveNotification(null), 30_000)
    return () => window.clearTimeout(timeout)
  }, [liveNotification])

  useEffect(() => {
    if (!socketUrl || !accessToken) return

    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket'],
    })

    socket.on('notification', (incoming: Omit<InAppNotification, 'isRead'> & { isRead?: boolean }) => {
      if (!incoming?.id || knownIds.current.has(incoming.id)) return

      const notification: InAppNotification = { ...incoming, isRead: false }
      knownIds.current.add(notification.id)
      setNotifications((current) => [notification, ...current].slice(0, 20))
      setUnreadCount((current) => current + 1)
      setLiveNotification(notification)
    })

    socket.on('connect_error', () => {
      // Socket.IO reconnects automatically; avoid surfacing noisy transient errors.
    })

    return () => {
      socket.disconnect()
    }
  }, [accessToken, socketUrl])

  function loadNotifications(nextUnreadOnly: boolean) {
    setUnreadOnly(nextUnreadOnly)
    startLoading(async () => {
      const result = await getNotifications(1, 20, nextUnreadOnly)
      if (result.error || !result.data) {
        toast.error(result.error ?? 'Failed to load notifications.')
        return
      }

      setNotifications(result.data.notifications)
      setUnreadCount(result.data.unreadCount)
      for (const notification of result.data.notifications) {
        knownIds.current.add(notification.id)
      }
    })
  }

  function markAllRead() {
    if (!unreadCount || isMarkingRead) return

    startMarkingRead(async () => {
      const result = await markAllNotificationsRead()
      if (result.error) {
        toast.error(result.error)
        return
      }

      setUnreadCount(0)
      setNotifications((current) =>
        unreadOnly ? [] : current.map((notification) => ({ ...notification, isRead: true }))
      )
      toast.success('All notifications marked as read.')
    })
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
        <div>
          <p className="text-sm font-semibold text-slate-900">Operations workspace</p>
          <p className="hidden text-xs text-slate-500 sm:block">Monitor and manage Asoose activity</p>
        </div>

        <div ref={panelRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={open}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
              open
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
              <div className="border-b border-slate-100 px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {unreadCount ? `${unreadCount} unread` : 'You are all caught up'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={markAllRead}
                    disabled={!unreadCount || isMarkingRead}
                    className="text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    {isMarkingRead ? 'Updating…' : 'Mark all read'}
                  </button>
                </div>

                <div className="mt-3 flex rounded-lg bg-slate-100 p-1">
                  {[
                    { label: 'All', value: false },
                    { label: 'Unread', value: true },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => loadNotifications(option.value)}
                      disabled={isLoading}
                      className={cn(
                        'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                        unreadOnly === option.value
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[min(30rem,calc(100vh-13rem))] overflow-y-auto">
                {isLoading ? (
                  <div className="space-y-4 p-4" aria-label="Loading notifications">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="flex animate-pulse gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-2/3 rounded bg-slate-100" />
                          <div className="h-3 w-full rounded bg-slate-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length ? (
                  notifications.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      onNavigate={() => setOpen(false)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center px-6 py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <BellIcon className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">
                      {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      New activity will appear here as it happens.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {liveNotification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 top-20 z-50 w-[min(31rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 sm:right-6 sm:top-22"
        >
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <NotificationGlyph type={liveNotification.type} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  New activity
                </p>
                <h2 className="mt-1.5 text-base font-bold leading-6 text-slate-900">
                  {liveNotification.title}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  {liveNotification.body}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLiveNotification(null)}
                aria-label="Close notification"
                className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLiveNotification(null)}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              >
                Dismiss
              </button>
              {notificationHref(liveNotification) && (
                <Link
                  href={notificationHref(liveNotification)!}
                  onClick={() => setLiveNotification(null)}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  View details
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
