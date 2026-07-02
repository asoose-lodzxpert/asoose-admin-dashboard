import type { Metadata } from 'next'
import { getVendors } from '@/app/actions/vendors'
import { VendorsTable } from './vendors-table'

export const metadata: Metadata = { title: 'Vendors' }

export default async function VendorsPage() {
  const { vendors, pagination } = await getVendors({ page: 1, limit: 20 })
  return <VendorsTable initialVendors={vendors} initialPagination={pagination} />
}
