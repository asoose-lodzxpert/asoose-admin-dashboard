import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPropertyDetail } from '@/app/actions/properties'
import { getPropertyTypes } from '@/app/actions/property-types'
import { getActiveCities } from '@/app/actions/cities'
import { PropertyDetailClient } from './property-detail-client'

export const metadata: Metadata = { title: 'Property Detail' }

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [property, propertyTypes, cities] = await Promise.all([
    getPropertyDetail(id),
    getPropertyTypes(),
    getActiveCities(),
  ])
  if (!property) notFound()
  return <PropertyDetailClient property={property} propertyTypes={propertyTypes} cities={cities} />
}
