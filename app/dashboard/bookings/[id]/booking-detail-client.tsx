'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { DetailCard, InfoRow, InfoGrid } from '@/app/components/ui/detail'
import { useToast } from '@/app/components/ui/toast'
import { cn, formatNaira } from '@/app/lib/utils'
import { checkInBooking, checkOutBooking } from '@/app/actions/bookings'
import type { BookingDetail, BookingStatus } from '@/app/lib/types'

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

function formatStatus(s: BookingStatus): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
}

function formatDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateOnly(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function BookingDetailClient({ booking: initial }: { booking: BookingDetail }) {
  const toast = useToast()
  const [booking, setBooking] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState('')

  function handleCheckIn() {
    startTransition(async () => {
      setActionError('')
      const res = await checkInBooking(booking.id)
      if (res.error) { setActionError(res.error); toast.error(res.error); return }
      if (res.data) setBooking((b) => ({ ...b, status: res.data!.status, checkedInAt: res.data!.checkedInAt ?? b.checkedInAt }))
      toast.success('Guest checked in.')
    })
  }

  function handleCheckOut() {
    startTransition(async () => {
      setActionError('')
      const res = await checkOutBooking(booking.id)
      if (res.error) { setActionError(res.error); toast.error(res.error); return }
      if (res.data) setBooking((b) => ({ ...b, status: res.data!.status, checkedOutAt: res.data!.checkedOutAt ?? b.checkedOutAt }))
      toast.success('Guest checked out.')
    })
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/dashboard/bookings" className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors w-fit">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Bookings
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 truncate font-mono">{booking.bookingNumber}</h1>
              <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[booking.status])}>
                <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[booking.status])} />
                {formatStatus(booking.status)}
              </span>
            </div>
            <p className="text-sm text-slate-500">{booking.property.name} · {booking.roomTypeName}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {booking.status === 'CONFIRMED' && (
              <Button size="sm" loading={isPending} onClick={handleCheckIn}>Check In</Button>
            )}
            {booking.status === 'CHECKED_IN' && (
              <Button size="sm" loading={isPending} onClick={handleCheckOut}>Check Out</Button>
            )}
          </div>
        </div>
        {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
      </div>

      {/* Content */}
      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <DetailCard title="Booking Info">
              <InfoGrid>
                <InfoRow label="Property" value={booking.property.name} />
                <InfoRow label="Room Type" value={booking.roomTypeName} />
                <InfoRow label="Check-in" value={formatDateOnly(booking.checkIn)} />
                <InfoRow label="Check-out" value={formatDateOnly(booking.checkOut)} />
                <InfoRow label="Nights" value={booking.nights} />
                <InfoRow label="Units Booked" value={booking.unitsBooked} />
                <InfoRow label="Guests" value={booking.guests} />
                {booking.specialRequests && <InfoRow label="Special Requests" value={booking.specialRequests} wide />}
              </InfoGrid>
            </DetailCard>

            <DetailCard title="Customer">
              <InfoGrid>
                <InfoRow label="Name" value={`${booking.customer.firstName} ${booking.customer.lastName}`} />
                <InfoRow label="Email" value={booking.customer.email} />
                <InfoRow label="Phone" value={booking.customer.phone} />
                <InfoRow label="Address" value={booking.property.address} wide />
              </InfoGrid>
            </DetailCard>

            {booking.status === 'CANCELLED' && (
              <DetailCard title="Cancellation">
                <InfoGrid>
                  <InfoRow label="Reason" value={booking.cancellationReason} wide />
                  <InfoRow label="Cancelled By" value={booking.cancelledBy} />
                  <InfoRow label="Cancelled At" value={formatDateTime(booking.cancelledAt)} />
                </InfoGrid>
              </DetailCard>
            )}
          </div>

          <div className="space-y-6">
            <DetailCard title="Pricing">
              <InfoGrid className="grid-cols-1">
                <InfoRow label="Price / Night" value={formatNaira(booking.pricePerNight)} />
                <InfoRow label="Subtotal" value={formatNaira(booking.subtotal)} />
                <InfoRow label="Total" value={formatNaira(booking.total)} />
              </InfoGrid>
            </DetailCard>

            <DetailCard title="Payment">
              <InfoGrid className="grid-cols-1">
                <InfoRow label="Method" value={booking.paymentMethod} />
                <InfoRow label="Status" value={booking.paymentStatus} />
              </InfoGrid>
            </DetailCard>

            <DetailCard title="Timeline">
              <InfoGrid className="grid-cols-1">
                <InfoRow label="Created" value={formatDateTime(booking.createdAt)} />
                <InfoRow label="Checked In" value={formatDateTime(booking.checkedInAt)} />
                <InfoRow label="Checked Out" value={formatDateTime(booking.checkedOutAt)} />
                <InfoRow label="Cancelled" value={formatDateTime(booking.cancelledAt)} />
                <InfoRow label="Last Updated" value={formatDateTime(booking.updatedAt)} />
              </InfoGrid>
            </DetailCard>
          </div>
        </div>
      </div>
    </div>
  )
}
