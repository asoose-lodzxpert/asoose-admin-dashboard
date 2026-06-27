import type { Metadata } from 'next'
import { getRiders } from '@/app/actions/riders'
import { RidersTable } from './riders-table'

export const metadata: Metadata = { title: 'Riders' }

export default async function RidersPage() {
  const { riders, pagination } = await getRiders({ page: 1, limit: 20 })
  return <RidersTable initialRiders={riders} total={pagination.total} />
}
