import type { Metadata } from 'next'
import { getActiveCities } from '@/app/actions/cities'
import { PropertyOwnerCreateClient } from './property-owner-create-client'

export const metadata: Metadata = { title: 'New Property Owner' }

export default async function PropertyOwnerCreatePage() {
  const cities = await getActiveCities()
  return <PropertyOwnerCreateClient cities={cities} />
}
