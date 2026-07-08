import type { Metadata } from 'next'
import { getPropertyTypes } from '@/app/actions/property-types'
import { PropertyTypesClient } from './property-types-client'

export const metadata: Metadata = { title: 'Property Types' }

export default async function PropertyTypesPage() {
  const propertyTypes = await getPropertyTypes()
  return <PropertyTypesClient initialPropertyTypes={propertyTypes} />
}
