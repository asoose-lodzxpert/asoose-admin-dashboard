'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatNaira } from '@/app/lib/utils'
import { getBookings } from '@/app/actions/bookings'
import type { BookingSummary, BookingStatus } from '@/app/lib/types'

const STATUS_STYLES: Record<BookingStatus, string> = {
  CONFIRMED:   'bg-sky-50 text-sky-700 ring-sky-600/20',
  CHECKED_IN:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CHECKED_OUT: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  CANCELLED:   'bg-red-50 text-red-700 ring-red-600/20',
}

const STATUS_DOT: Record<BookingStatus, string> = {
  CONFIRMED:   'bg-sky-500',
  CHECKED_IN:  'bg-emerald-500',
  CHECKED_OUT: 'bg-slate-400',
  CANCELLED:   'bg-red-500',
}

const STATUS_FILTERS: { label: string; value: BookingStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Checked In', value: 'CHECKED_IN' },
  { label: 'Checked Out', value: 'CHECKED_OUT' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

function formatStatus(s: BookingStatus): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
}

function formatDateShort(d: string): string {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function BookingsTable({
  initialBookings,
  total,
}: {
  initialBookings: BookingSummary[]
  total: number
}) {
  const router = useRouter()
  const [bookings, setBookings] = useState(initialBookings)
  const [count, setCount] = useState(total)
  const [status, setStatus] = useState<BookingStatus | ''>('')
  const [isPending, startTransition] = useTransition()

  function onStatusFilter(value: BookingStatus | '') {
    setStatus(value)
    startTransition(async () => {
      const res = await getBookings({ status: value || undefined, page: 1, limit: 20 })
      setBookings(res.bookings)
      setCount(res.pagination.total)
    })
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
        <p className="mt-0.5 text-sm text-slate-500">{count} bookings on the platform.</p>
      </div>

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
      </div>

      <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden', isPending && 'opacity-60 pointer-events-none transition-opacity')}>
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">No bookings found</p>
            <p className="mt-0.5 text-xs text-slate-400">Try adjusting the filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400 min-w-48">Booking</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Customer</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Property / Room</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Stay</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs font-medium text-slate-900">{booking.bookingNumber}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateShort(booking.createdAt)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[booking.status])}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[booking.status])} />
                        {formatStatus(booking.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{booking.customer.firstName} {booking.customer.lastName}</p>
                      <p className="text-xs text-slate-400">{booking.customer.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-700">{booking.propertyName}</p>
                      <p className="text-xs text-slate-400">{booking.roomTypeName}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {formatDateShort(booking.checkIn)} → {formatDateShort(booking.checkOut)}
                      <span className="ml-1 text-xs text-slate-400">({booking.nights}n)</span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {formatNaira(booking.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
