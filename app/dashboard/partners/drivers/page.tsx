import type { Metadata } from 'next'
import { getDrivers } from '@/app/actions/drivers'
import { DriversTable } from './drivers-table'

export const metadata: Metadata = { title: 'Drivers' }

export default async function DriversPage() {
  const { drivers, pagination } = await getDrivers({ page: 1, limit: 20 })
  return <DriversTable initialDrivers={drivers} total={pagination.total} />
}
