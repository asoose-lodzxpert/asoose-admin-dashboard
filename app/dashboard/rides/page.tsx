import type { Metadata } from 'next'
import { getRides } from '@/app/actions/rides'
import { RidesTable } from './rides-table'

export const metadata: Metadata = { title: 'Rides' }

export default async function RidesPage() {
  const { rides, pagination } = await getRides({ page: 1, limit: 20 })
  return <RidesTable initialRides={rides} initialPagination={pagination} />
}
