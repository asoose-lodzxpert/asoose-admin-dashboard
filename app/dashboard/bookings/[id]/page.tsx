import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getBookingDetail } from '@/app/actions/bookings'
import { BookingDetailClient } from './booking-detail-client'

export const metadata: Metadata = { title: 'Booking Detail' }

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const booking = await getBookingDetail(id)
  if (!booking) notFound()
  return <BookingDetailClient booking={booking} />
}
