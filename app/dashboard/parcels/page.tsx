import type { Metadata } from 'next'
import { getParcels } from '@/app/actions/parcels'
import { ParcelsTable } from './parcels-table'

export const metadata: Metadata = { title: 'Parcels' }

export default async function ParcelsPage() {
  const { parcels, pagination } = await getParcels({ page: 1, limit: 20 })
  return <ParcelsTable initialParcels={parcels} initialPagination={pagination} />
}
