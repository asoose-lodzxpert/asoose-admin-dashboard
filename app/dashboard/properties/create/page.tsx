import type { Metadata } from 'next'
import { getPropertyTypes } from '@/app/actions/property-types'
import { getActiveCities } from '@/app/actions/cities'
import { PropertyCreateClient } from './property-create-client'

export const metadata: Metadata = { title: 'New Property' }

export default async function PropertyCreatePage() {
  const [propertyTypes, cities] = await Promise.all([
    getPropertyTypes(),
    getActiveCities(),
  ])
  return <PropertyCreateClient propertyTypes={propertyTypes} cities={cities} />
}
