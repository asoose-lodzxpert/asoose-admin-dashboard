import type { Metadata } from 'next'
import { getBookings } from '@/app/actions/bookings'
import { BookingsTable } from './bookings-table'

export const metadata: Metadata = { title: 'Bookings' }

export default async function BookingsPage() {
  const { bookings, pagination } = await getBookings({ page: 1, limit: 20 })
  return <BookingsTable initialBookings={bookings} total={pagination.total} />
}
