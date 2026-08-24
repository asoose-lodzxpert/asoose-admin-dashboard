import type { Metadata } from 'next'
import { getPropertyOwners } from '@/app/actions/property-owners'
import { PropertyOwnersTable } from './property-owners-table'

export const metadata: Metadata = { title: 'Property Owners' }

export default async function PropertyOwnersPage() {
  const { propertyOwners, pagination } = await getPropertyOwners({ page: 1, limit: 20 })

  return (
    <PropertyOwnersTable
      initialPropertyOwners={propertyOwners}
      initialPagination={pagination}
    />
  )
}
