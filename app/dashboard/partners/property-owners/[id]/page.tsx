import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPropertyOwnerDetail } from '@/app/actions/property-owners'
import { PropertyOwnerDetailClient } from './property-owner-detail-client'

export const metadata: Metadata = { title: 'Property Owner Detail' }

export default async function PropertyOwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const propertyOwner = await getPropertyOwnerDetail(id)
  if (!propertyOwner) notFound()

  return <PropertyOwnerDetailClient propertyOwner={propertyOwner} />
}
