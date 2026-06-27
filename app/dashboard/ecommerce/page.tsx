import type { Metadata } from 'next'
import { getVendors } from '@/app/actions/vendors'
import { VendorsClient } from './vendors-client'

export const metadata: Metadata = { title: 'Ecommerce' }

export default async function EcommercePage() {
  const { vendors, pagination } = await getVendors({ status: '', page: 1, limit: 20 })

  return <VendorsClient initialVendors={vendors} initialPagination={pagination} />
}
